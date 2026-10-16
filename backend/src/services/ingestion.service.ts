import axios from 'axios';
import cron from 'node-cron';
import { dbPool, withTransaction } from '../db/connection.js';
import { ENV } from '../config/env.js';
import { RealtimeService } from './realtime.service.js';

export class IngestionService {
  public static startAutomatedEngine() {
    // Poll international sports every 10 minutes
    cron.schedule('*/10 * * * *', async () => {
      console.log('Automated Ingestion: Synchronizing global fixtures...');
      await this.syncGlobalFixtures();
    });
  }

  public static async syncGlobalFixtures() {
    if (!ENV.THE_ODDS_API_KEY || ENV.THE_ODDS_API_KEY === 'placeholder_sports_api_key') {
      console.log('Automated Ingestion: Using mock sync mode (placeholder key detected).');
      return;
    }

    try {
      const sportsEndpoint = `${ENV.THE_ODDS_API_BASE_URL}/v4/sports/soccer_epl/odds/?apiKey=${ENV.THE_ODDS_API_KEY}&regions=eu&markets=h2h`;
      const response = await axios.get(sportsEndpoint, { timeout: 10000 });
      const games = response.data;

      if (!Array.isArray(games)) return;

      for (const game of games) {
        await withTransaction(async (client) => {
          const fixtureRes = await client.query(
            `INSERT INTO fixtures 
              (external_provider_id, sport, tournament, home_team, away_team, start_time, match_status)
             VALUES ($1, 'Soccer', 'English Premier League', $2, $3, $4, 'PRE_MATCH')
             ON CONFLICT (external_provider_id) DO UPDATE 
             SET start_time = EXCLUDED.start_time, updated_at = NOW()
             RETURNING id;`,
            [game.id, game.home_team, game.away_team, game.commence_time]
          );

          const fixtureId = fixtureRes.rows[0].id;
          const bookmaker = game.bookmakers?.[0];
          const market = bookmaker?.markets?.find((m: any) => m.key === 'h2h');

          if (market && Array.isArray(market.outcomes)) {
            for (const outcome of market.outcomes) {
              let outcomeType = 'DRAW';
              if (outcome.name === game.home_team) outcomeType = 'HOME';
              if (outcome.name === game.away_team) outcomeType = 'AWAY';

              const rawOdds = parseFloat(outcome.price);
              if (isNaN(rawOdds) || rawOdds < 1.01) continue;

              const mRes = await client.query(
                `INSERT INTO markets (fixture_id, market_type, outcome_name, raw_odds_decimal, is_active)
                 VALUES ($1, '1X2', $2, $3, TRUE)
                 ON CONFLICT (fixture_id, market_type, outcome_name) 
                 DO UPDATE SET raw_odds_decimal = EXCLUDED.raw_odds_decimal, updated_at = NOW()
                 RETURNING id;`,
                [fixtureId, outcomeType, rawOdds]
              );

              // Broadcast real-time odds tick to connected browsers
              await RealtimeService.broadcastOddsTick({
                fixtureId,
                marketId: mRes.rows[0].id,
                outcomeName: outcomeType,
                rawOddsDecimal: rawOdds,
                isActive: true,
                timestamp: Date.now(),
              });
            }
          }
        });
      }
    } catch (err: any) {
      console.error('Ingestion Error fetching external fixtures:', err.message);
    }
  }
}