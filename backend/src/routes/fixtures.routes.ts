import { FastifyInstance } from 'fastify';
import { dbPool } from '../db/connection.js';
import { IngestionService } from '../services/ingestion.service.js';

export async function fixturesRoutes(server: FastifyInstance) {
  // GET /api/v1/fixtures — Fetch Real Matches from Database
  server.get('/', async (request, reply) => {
    const query = `
      SELECT 
        f.id, f.sport, f.tournament, f.home_team, f.away_team, 
        f.start_time, f.match_status, f.live_home_score, f.live_away_score,
        f.external_provider_id,
        COALESCE(
          json_agg(
            json_build_object(
              'marketId', m.id,
              'marketType', m.market_type,
              'outcomeName', m.outcome_name,
              'rawOddsDecimal', m.raw_odds_decimal,
              'isActive', m.is_active
            ) ORDER BY m.outcome_name ASC
          ) FILTER (WHERE m.id IS NOT NULL), '[]'
        ) as markets
      FROM fixtures f
      LEFT JOIN markets m ON f.id = m.fixture_id
      WHERE f.match_status IN ('PRE_MATCH', 'LIVE')
      GROUP BY f.id
      ORDER BY f.match_status DESC, f.start_time ASC;
    `;

    const res = await dbPool.query(query);
    return reply.send({ fixtures: res.rows });
  });

  // POST /api/v1/fixtures/sync-now — Force instant sync from The Odds API
  server.post('/sync-now', async (request, reply) => {
    try {
      const result = await IngestionService.syncGlobalFixtures();
      return reply.send(result);
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });
}
