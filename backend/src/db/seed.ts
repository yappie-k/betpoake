import fs from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';
import { dbPool, withTransaction } from './connection.js';

function getMigrationsSql(): string {
  const candidates = [
    path.resolve(process.cwd(), 'src/db/migrations.sql'),
    path.resolve(process.cwd(), 'backend/src/db/migrations.sql'),
    path.resolve(process.cwd(), 'dist/db/migrations.sql')
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      return fs.readFileSync(c, 'utf-8');
    }
  }
  throw new Error(`migrations.sql not found in candidate paths: ${candidates.join(', ')}`);
}

async function runSeed() {
  console.log('Connecting to PostgreSQL database with retries...');
  
  // Retry loop: Wait up to 30s for Postgres to become ready on Railway
  let connected = false;
  for (let i = 1; i <= 6; i++) {
    try {
      await dbPool.query('SELECT 1;');
      connected = true;
      console.log('PostgreSQL database connection verified.');
      break;
    } catch (err: any) {
      console.warn(`[Attempt ${i}/6] Database not ready yet (${err.message}). Retrying in 4s...`);
      await new Promise((res) => setTimeout(res, 4000));
    }
  }

  if (!connected) {
    console.error('Could not connect to PostgreSQL after multiple attempts. Skipping migration.');
    process.exit(0); // Exit cleanly so server can still boot
  }

  const migrationSql = getMigrationsSql();
  await dbPool.query(migrationSql);
  console.log('Postgres Schema Verified and Applied.');

  await withTransaction(async (client) => {
    // 1. Initialize System Internal Accounts
    const systemAccounts = [
      'SYSTEM_GATEWAY_FLOAT',
      'SYSTEM_ESCROW',
      'SYSTEM_HOUSE_REVENUE',
      'TAX_WITHHOLDING_ACCOUNT',
    ];

    for (const identifier of systemAccounts) {
      await client.query(
        `INSERT INTO ledger_accounts (user_id, asset_type, account_identifier, balance_micro_units, locked_micro_units)
         VALUES (NULL, 'KES', $1, 0, 0)
         ON CONFLICT (account_identifier) DO NOTHING;`,
        [identifier]
      );
    }

    // 2. Seed Superadmin User
    const adminEmail = 'admin@betpoake.co.ke';
    const existingAdmin = await client.query('SELECT id FROM users WHERE email = $1', [adminEmail]);

    let adminId: string;
    if (existingAdmin.rows.length === 0) {
      const passwordHash = await bcrypt.hash('BetPoakeAdmin2026!', 12);
      const res = await client.query(
        `INSERT INTO users (email, phone_number, password_hash, role, status, date_of_birth, kyc_verified)
         VALUES ($1, '+254700000001', $2, 'SUPERADMIN', 'ACTIVE', '1990-01-01', TRUE)
         RETURNING id;`,
        [adminEmail, passwordHash]
      );
      adminId = res.rows[0].id;

      await client.query(
        `INSERT INTO ledger_accounts (user_id, asset_type, account_identifier, balance_micro_units, locked_micro_units)
         VALUES ($1, 'KES', $2, 0, 0);`,
        [adminId, `USER_WALLET_${adminId}`]
      );
    } else {
      adminId = existingAdmin.rows[0].id;
    }

    // 3. Seed Grassroots Demo Match
    const fixtureCheck = await client.query(
      `SELECT id FROM fixtures WHERE external_provider_id = 'MANUAL_LOCAL_KIBERA_DERBY_01'`
    );

    if (fixtureCheck.rows.length === 0) {
      const fixtureRes = await client.query(
        `INSERT INTO fixtures (external_provider_id, sport, tournament, home_team, away_team, start_time, match_status, live_home_score, live_away_score)
         VALUES ('MANUAL_LOCAL_KIBERA_DERBY_01', 'Soccer', 'Nairobi South County League', 'Kibera Black Stars B', 'Githurai United', NOW() + interval '2 hours', 'PRE_MATCH', 0, 0)
         RETURNING id;`
      );
      const fixtureId = fixtureRes.rows[0].id;

      await client.query(
        `INSERT INTO markets (fixture_id, market_type, outcome_name, raw_odds_decimal, is_active)
         VALUES 
          ($1, '1X2', 'HOME', 2.150, TRUE),
          ($1, '1X2', 'DRAW', 3.200, TRUE),
          ($1, '1X2', 'AWAY', 3.450, TRUE);`,
        [fixtureId]
      );
    }
  });

  console.log('Seeding completed successfully.');
  process.exit(0);
}

runSeed().catch((err) => {
  console.error('Migration Seed Warning:', err);
  process.exit(0); // Non-fatal so container doesn't restart continuously
});
