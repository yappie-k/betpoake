import axios from 'axios';
import cron from 'node-cron';
import { dbPool, withTransaction } from '../db/connection.js';
import { ENV } from '../config/env.js';
import { RealtimeService } from './realtime.service.js';

export class IngestionService {
  private static readonly ACTIVE_SPORTS = [
    { key: 'soccer_epl', name: 'English Premier League', sport: 'Soccer' },
    { key: 'soccer_uefa_champs_league', name: 'UEFA Champions League', sport: 'Soccer' },
    { key: 'soccer_spain_la_liga', name: 'La Liga Spain', sport: 'Soccer' },
    { key: 'basketball_nba', name: 'NBA Basketball', sport: 'Basketball' },
  ];

  public static startAutomatedEngine() {
    // Poll international live schedules every 10 minutes
    cron.schedule('*/10 * * * *', async () => {
      console.log('[Ingestion Worker] Running scheduled global odds sync...');
      await this.syncGlobalFixtures();
    });

    // Also trigger initial sync 5 seconds after server boot
    setTimeout(() => {
      this.syncGlobalFixtures();
    }, 5000);
  }

  public static async syncGlobalFixtures(): Promise<{ synced: number; message: string }> {
    if (!ENV.THE_ODDS_API_KEY || ENV.THE_ODDS_API_KEY === 'placeholder_sports_api_key' || ENV.THE_ODDS_API_KEY.includes('PASTE_')) {
      console.warn('[Ingestion Worker] Valid THE_ODDS_API_KEY not configured. Skipping external fetch.');
      return { synced: 0, message: 'Missing valid THE_ODDS_API_KEY in environment' };
    }

    let totalSynced = 0;

    for (const sportConfig of this.ACTIVE_SPORTS) {
      try {
        const url = `${ENV.THE_ODDS_API_BASE_URL}/v4/sports/${sportConfig.key}/odds/?apiKey=${ENV.THE_ODDS_API_KEY}&regions=eu&markets=h2h`;
        const response = await axios.get(url, { timeout: 12000 });
        const games = response.data;

        if (!Array.isArray(games)) continue;

        for (const game of games) {
          // Skip games that have already started
          const commenceTime = new Date(game.commence_time);
          if (commenceTime.getTime() < Date.now() - 3600000) continue;

          await withTransaction(async (client) => {
            // 1. Upsert Real Fixture
            const fixtureRes = await client.query(
              `INSERT INTO fixtures 
                (external_provider_id, sport, tournament, home_team, away_team, start_time, match_status)
               VALUES ($1, $2, $3, $4, $5, $6, 'PRE_MATCH')
               ON CONFLICT (external_provider_id) DO UPDATE 
               SET start_time = EXCLUDED.start_time, updated_at = NOW()
               RETURNING id;`,
              [game.id, sportConfig.sport, sportConfig.name, game.home_team, game.away_team, game.commence_time]
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

                // 2. Upsert Moving Market Odds
                const mRes = await client.query(
                  `INSERT INTO markets (fixture_id, market_type, outcome_name, raw_odds_decimal, is_active)
                   VALUES ($1, '1X2', $2, $3, TRUE)
                   ON CONFLICT (fixture_id, market_type, outcome_name) 
                   DO UPDATE SET raw_odds_decimal = EXCLUDED.raw_odds_decimal, updated_at = NOW()
                   RETURNING id;`,
                  [fixtureId, outcomeType, rawOdds]
                );

                // 3. Broadcast sub-15ms WebSocket tick down to user devices
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
        console.error(`[Ingestion Error] Failed fetching ${sportConfig.name}:`, err.response?.data?.message || err.message);
      }
    }

    return { synced: totalSynced, message: `Successfully synchronized ${totalSynced} live international matches.` };
  }
}
