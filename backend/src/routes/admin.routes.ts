import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { dbPool, withTransaction } from '../db/connection.js';
import { RealtimeService } from '../services/realtime.service.js';
import { SettlementService } from '../services/settlement.service.js';

export async function adminRoutes(server: FastifyInstance) {
  server.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify();
      const user = request.user as { role: string };
      if (user.role !== 'BOOKMAKER' && user.role !== 'SUPERADMIN') {
        return reply.status(403).send({ error: 'Access restricted to Bookmakers and Superadmins' });
      }
    } catch {
      return reply.status(401).send({ error: 'Authentication required' });
    }
  });

  // 1. Create Local Grassroots Fixture
  server.post('/fixtures', async (request, reply) => {
    const fixtureSchema = z.object({
      sport: z.string().default('Soccer'),
      tournament: z.string(),
      homeTeam: z.string(),
      awayTeam: z.string(),
      startTime: z.string(),
      homeOdds: z.number().min(1.01),
      drawOdds: z.number().min(1.01),
      awayOdds: z.number().min(1.01),
    });

    const parsed = fixtureSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid parameters', details: parsed.error.format() });
    }

    const d = parsed.data;
    const localProviderId = `MANUAL_LOCAL_${Date.now()}`;

    const created = await withTransaction(async (client) => {
      const fRes = await client.query(
        `INSERT INTO fixtures 
          (external_provider_id, sport, tournament, home_team, away_team, start_time, match_status)
         VALUES ($1, $2, $3, $4, $5, $6, 'PRE_MATCH')
         RETURNING id`,
        [localProviderId, d.sport, d.tournament, d.homeTeam, d.awayTeam, d.startTime]
      );
      const fixtureId = fRes.rows[0].id;

      await client.query(
        `INSERT INTO markets (fixture_id, market_type, outcome_name, raw_odds_decimal, is_active)
         VALUES 
          ($1, '1X2', 'HOME', $2, TRUE),
          ($1, '1X2', 'DRAW', $3, TRUE),
          ($1, '1X2', 'AWAY', $4, TRUE)`,
        [fixtureId, d.homeOdds, d.drawOdds, d.awayOdds]
      );

      return fixtureId;
    });

    return reply.status(201).send({ success: true, fixtureId: created });
  });

  // 2. Referee Live Score Controller (+1 / -1 counters)
  server.patch('/fixtures/:id/score', async (request, reply) => {
    const params = request.params as { id: string };
    const scoreSchema = z.object({
      homeScore: z.number().int().min(0),
      awayScore: z.number().int().min(0),
      status: z.enum(['PRE_MATCH', 'LIVE', 'COMPLETED', 'CANCELLED']),
    });

    const parsed = scoreSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid score values' });
    }

    const { homeScore, awayScore, status } = parsed.data;

    await dbPool.query(
      `UPDATE fixtures 
       SET live_home_score = $1, live_away_score = $2, match_status = $3, updated_at = NOW() 
       WHERE id = $4`,
      [homeScore, awayScore, status, params.id]
    );

    // Broadcast instant update
    await RealtimeService.broadcastOddsTick({
      fixtureId: params.id,
      marketId: 'SCORE_UPDATE',
      outcomeName: 'SCORE',
      rawOddsDecimal: 1.0,
      isActive: status !== 'COMPLETED',
      score: { home: homeScore, away: awayScore },
      status,
      timestamp: Date.now(),
    });

    // If match was toggled to COMPLETED, fire automated tax and bet settlement engine
    if (status === 'COMPLETED') {
      await SettlementService.settleCompletedFixture(params.id, homeScore, awayScore);
    }

    return reply.send({ success: true });
  });

  // 3. Master Freeze Switch (Lock Odds)
  server.patch('/fixtures/:id/lock-odds', async (request, reply) => {
    const params = request.params as { id: string };
    const lockSchema = z.object({
      isLocked: z.boolean(),
    });

    const parsed = lockSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid parameters' });
    }

    const isActive = !parsed.data.isLocked;

    await dbPool.query(
      `UPDATE markets SET is_active = $1, updated_at = NOW() WHERE fixture_id = $2`,
      [isActive, params.id]
    );

    await RealtimeService.broadcastFreezeSwitch(params.id, isActive);

    return reply.send({ success: true, isLocked: !isActive });
  });
}
