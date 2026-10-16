import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { withTransaction } from '../db/connection.js';
import { LedgerService } from '../services/ledger.service.js';

export async function betsRoutes(server: FastifyInstance) {
  server.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      return reply.status(401).send({ error: 'Unauthorized wager attempt' });
    }
  });

  const placeBetSchema = z.object({
    stakeKes: z.number().positive(),
    legs: z.array(
      z.object({
        marketId: z.string().uuid(),
        outcomeName: z.string(),
      })
    ).min(1),
  });

  server.post('/place', async (request, reply) => {
    const userPayload = request.user as { id: string };
    const parse = placeBetSchema.safeParse(request.body);

    if (!parse.success) {
      return reply.status(400).send({ error: 'Invalid bet ticket parameters', details: parse.error.format() });
    }

    const { stakeKes, legs } = parse.data;
    // 1 KES = 100 micro-cents
    const stakeMicroUnits = BigInt(Math.round(stakeKes * 100));

    try {
      const betTicket = await withTransaction(async (client) => {
        // 1. Fetch Markets and verify odds & active flags
        let totalOddsMultiplier = 1.0;
        const verifiedLegs: Array<{ marketId: string; outcomeName: string; odds: number }> = [];

        for (const leg of legs) {
          const marketRes = await client.query(
            `SELECT m.id, m.raw_odds_decimal, m.is_active, f.match_status
             FROM markets m
             JOIN fixtures f ON m.fixture_id = f.id
             WHERE m.id = $1 AND m.outcome_name = $2`,
            [leg.marketId, leg.outcomeName]
          );

          if (marketRes.rows.length === 0) {
            throw new Error(`Market outcome not found: ${leg.marketId}`);
          }

          const market = marketRes.rows[0];
          if (!market.is_active) {
            throw new Error(`Betting line has been locked/frozen by the bookmaker.`);
          }
          if (market.match_status === 'COMPLETED' || market.match_status === 'CANCELLED') {
            throw new Error(`Fixture has already concluded.`);
          }

          const legOdds = parseFloat(market.raw_odds_decimal);
          totalOddsMultiplier *= legOdds;
          verifiedLegs.push({
            marketId: market.id,
            outcomeName: leg.outcomeName,
            odds: legOdds,
          });
        }

        // Potential Gross Payout
        const grossPotentialPayoutMicro = BigInt(Math.round(Number(stakeMicroUnits) * totalOddsMultiplier));

        // 2. Ledger Transfer: Debit User Wallet -> Credit Escrow
        const userWalletId = await LedgerService.getUserAccountId(client, userPayload.id);
        const escrowAccountId = await LedgerService.getSystemAccountId(client, 'SYSTEM_ESCROW');

        const betIdRes = await client.query('SELECT uuid_generate_v4() as id');
        const betId = betIdRes.rows[0].id;

        await LedgerService.executeDoubleEntry(client, [
          {
            accountId: userWalletId,
            entryType: 'DEBIT',
            amountMicroUnits: stakeMicroUnits,
            category: 'WAGER_STAKE',
            referenceId: `BET_STAKE_${betId}`,
          },
          {
            accountId: escrowAccountId,
            entryType: 'CREDIT',
            amountMicroUnits: stakeMicroUnits,
            category: 'WAGER_STAKE',
            referenceId: `BET_ESCROW_HOLD_${betId}`,
          },
        ]);

        // 3. Write Bet Row & Legs
        await client.query(
          `INSERT INTO bets 
            (id, user_id, total_stake_micro_units, total_odds_decimal, potential_payout_micro_units, status)
           VALUES ($1, $2, $3, $4, $5, 'PENDING')`,
          [
            betId,
            userPayload.id,
            stakeMicroUnits.toString(),
            totalOddsMultiplier.toFixed(4),
            grossPotentialPayoutMicro.toString(),
          ]
        );

        for (const vLeg of verifiedLegs) {
          await client.query(
            `INSERT INTO bet_legs (bet_id, market_id, selected_outcome, odds_at_placement, status)
             VALUES ($1, $2, $3, $4, 'PENDING')`,
            [betId, vLeg.marketId, vLeg.outcomeName, vLeg.odds]
          );
        }

        return {
          betId,
          totalStakeKes: stakeKes,
          totalOdds: totalOddsMultiplier.toFixed(3),
          potentialPayoutKes: (Number(grossPotentialPayoutMicro) / 100).toFixed(2),
        };
      });

      return reply.status(201).send({ success: true, betTicket });
    } catch (err: any) {
      return reply.status(400).send({ error: err.message || 'Bet placement rejected' });
    }
  });
}