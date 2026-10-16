import { FastifyInstance } from 'fastify';
import { dbPool } from '../db/connection.js';

export async function fixturesRoutes(server: FastifyInstance) {
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
            )
          ) FILTER (WHERE m.id IS NOT NULL), '[]'
        ) as markets
      FROM fixtures f
      LEFT JOIN markets m ON f.id = m.fixture_id
      WHERE f.match_status IN ('PRE_MATCH', 'LIVE')
      GROUP BY f.id
      ORDER BY f.start_time ASC;
    `;

    const res = await dbPool.query(query);
    return reply.send({ fixtures: res.rows });
  });
}