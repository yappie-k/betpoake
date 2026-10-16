import axios from 'axios';
import cron from 'node-cron';
import { dbPool, withTransaction } from '../db/connection.js';
import { ENV } from '../config/env.js';
import { RealtimeService } from './realtime.service.js';

export class IngestionService {
  public static startAutomatedEngine() {
    // 1. Poll international sports every 10 minutes
    cron.schedule('*/10 * * * *', async () => {
      console.log('[Ingestion Worker] Running live global odds sync...');
      await this.syncGlobalFixtures();
    });

    // 2. Initial sync 5s after startup
    setTimeout(() => {
      this.syncGlobalFixtures();
    }, 5000);
  }

  public static async syncGlobalFixtures(): Promise<{ synced: number; message: string }> {
    const apiKey = ENV.THE_ODDS_API_KEY;

    if (!apiKey || apiKey === 'placeholder_sports_api_key' || apiKey.includes('PASTE_')) {
      return {
        synced: 0,
        message: 'No valid THE_ODDS_API_KEY found in environment. Please add your key to Railway.',
      };
    }

    let totalSynced = 0;

    // Endpoints for real upcoming matches
    const endpoints = [
      `${ENV.THE_ODDS_API_BASE_URL}/v4/sports/upcoming/odds/?apiKey=${apiKey}&regions=eu&markets=h2h`,
      `${ENV.THE_ODDS_API_BASE_URL}/v4/sports/soccer_epl/odds/?apiKey=${apiKey}&regions=eu&markets=h2h`,
      `${ENV.THE_ODDS_API_BASE_URL}/v4/sports/basketball_nba/odds/?apiKey=${apiKey}&regions=eu&markets=h2h`,
    ];

    for (const url of endpoints) {
      try {
        const response = await axios.get(url, { timeout: 15000 });
        const games = response.data;

        if (!Array.isArray(games)) continue;

        for (const game of games) {
          const commenceTime = new Date(game.commence_time);
          // Only pull games commencing in the future or currently live
          if (commenceTime.getTime() < Date.now() - 7200000) continue;

          await withTransaction(async (client) => {
            // Upsert real fixture
            const fixtureRes = await client.query(
              `INSERT INTO fixtures 
                (external_provider_id, sport, tournament, home_team, away_team, start_time, match_status)
               VALUES ($1, $2, $3, $4, $5, $6, 'PRE_MATCH')
               ON CONFLICT (external_provider_id) DO UPDATE 
               SET start_time = EXCLUDED.start_time, updated_at = NOW()
               RETURNING id;`,
              [
                game.id,
                game.sport_title || 'Soccer',
                game.sport_title || 'Live League',
                game.home_team,
                game.away_team,
                game.commence_time,
              ]
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

                // Upsert real bookmaker decimal odds
                const mRes = await client.query(
                  `INSERT INTO markets (fixture_id, market_type, outcome_name, raw_odds_decimal, is_active)
                   VALUES ($1, '1X2', $2, $3, TRUE)
                   ON CONFLICT (fixture_id, market_type, outcome_name) 
                   DO UPDATE SET raw_odds_decimal = EXCLUDED.raw_odds_decimal, updated_at = NOW()
                   RETURNING id;`,
                  [fixtureId, outcomeType, rawOdds]
                );

                // Broadcast real-time odds tick to connected devices
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
          totalSynced++;
        }
      } catch (err: any) {
        console.error('[Live Sports Fetch Error]:', err.response?.data?.message || err.message);
      }
    }

    return {
      synced: totalSynced,
      message: `Synchronized ${totalSynced} real fixtures from The Odds API.`,
    };
  }
}
