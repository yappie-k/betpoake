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
    if (fs.existsSync(c)) return fs.readFileSync(c, 'utf-8');
  }
  throw new Error(`migrations.sql not found in candidate paths: ${candidates.join(', ')}`);
}

async function runSeed() {
  console.log('Connecting to PostgreSQL database...');
  let connected = false;
  for (let i = 1; i <= 6; i++) {
    try {
      await dbPool.query('SELECT 1;');
      connected = true;
      break;
    } catch {
      await new Promise((res) => setTimeout(res, 3000));
    }
  }

  if (!connected) process.exit(0);

  const migrationSql = getMigrationsSql();
  await dbPool.query(migrationSql);

  await withTransaction(async (client) => {
    // 1. Initialize System Double-Entry Accounts
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

    // 2. Initialize Admin User
    const adminEmail = 'admin@betpoake.co.ke';
    const existingAdmin = await client.query('SELECT id FROM users WHERE email = $1', [adminEmail]);

    if (existingAdmin.rows.length === 0) {
      const passwordHash = await bcrypt.hash('BetPoakeAdmin2026!', 12);
      const res = await client.query(
        `INSERT INTO users (email, phone_number, password_hash, role, status, date_of_birth, kyc_verified)
         VALUES ($1, '+254700000001', $2, 'SUPERADMIN', 'ACTIVE', '1990-01-01', TRUE)
         RETURNING id;`,
        [adminEmail, passwordHash]
      );
      const adminId = res.rows[0].id;

      await client.query(
        `INSERT INTO ledger_accounts (user_id, asset_type, account_identifier, balance_micro_units, locked_micro_units)
         VALUES ($1, 'KES', $2, 0, 0);`,
        [adminId, `USER_WALLET_${adminId}`]
      );
    }
  });

  console.log('System ledgers initialized.');
  process.exit(0);
}

runSeed().catch(() => process.exit(0));
