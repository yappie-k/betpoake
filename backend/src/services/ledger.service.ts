import { PoolClient } from 'pg';
import crypto from 'crypto';

export interface JournalPosting {
  accountId: string;
  entryType: 'DEBIT' | 'CREDIT';
  amountMicroUnits: bigint;
  category: 'DEPOSIT' | 'WITHDRAWAL' | 'WAGER_STAKE' | 'WAGER_PAYOUT' | 'TAX_WITHHOLDING' | 'HOUSE_REVENUE';
  referenceId: string;
  metadata?: Record<string, unknown>;
}

export class LedgerService {
  /**
   * Enforces double-entry balanced postings.
   * Total DEBITS must precisely equal Total CREDITS.
   */
  public static async executeDoubleEntry(
    client: PoolClient,
    postings: JournalPosting[]
  ): Promise<string> {
    if (postings.length < 2) {
      throw new Error('A balanced double-entry transaction requires at least 2 postings.');
    }

    let totalDebits = 0n;
    let totalCredits = 0n;

    for (const post of postings) {
      if (post.amountMicroUnits <= 0n) {
        throw new Error('Transaction amounts must be strictly positive micro-units.');
      }
      if (post.entryType === 'DEBIT') {
        totalDebits += post.amountMicroUnits;
      } else if (post.entryType === 'CREDIT') {
        totalCredits += post.amountMicroUnits;
      }
    }

    if (totalDebits !== totalCredits) {
      throw new Error(
        `Ledger Unbalanced Error: Debits (${totalDebits.toString()}) != Credits (${totalCredits.toString()})`
      );
    }

    const transactionGroupId = crypto.randomUUID();

    for (const post of postings) {
      // 1. Lock ledger account row
      const accountRes = await client.query(
        `SELECT id, balance_micro_units, locked_micro_units 
         FROM ledger_accounts 
         WHERE id = $1 FOR UPDATE`,
        [post.accountId]
      );

      if (accountRes.rows.length === 0) {
        throw new Error(`Target account ID not found: ${post.accountId}`);
      }

      const currentBalance = BigInt(accountRes.rows[0].balance_micro_units);

      // Debit reduces liability/user balance, Credit increases it
      let newBalance = currentBalance;
      if (post.entryType === 'DEBIT') {
        if (currentBalance < post.amountMicroUnits) {
          throw new Error(`Insufficient funds in ledger account: ${post.accountId}`);
        }
        newBalance = currentBalance - post.amountMicroUnits;
      } else {
        newBalance = currentBalance + post.amountMicroUnits;
      }

      await client.query(
        `UPDATE ledger_accounts 
         SET balance_micro_units = $1, updated_at = NOW() 
         WHERE id = $2`,
        [newBalance.toString(), post.accountId]
      );

      // 2. Append immutable record to transaction journal
      await client.query(
        `INSERT INTO transaction_journal 
          (transaction_group_id, entry_type, account_id, amount_micro_units, transaction_category, reference_id, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          transactionGroupId,
          post.entryType,
          post.accountId,
          post.amountMicroUnits.toString(),
          post.category,
          post.referenceId,
          JSON.stringify(post.metadata || {}),
        ]
      );
    }

    return transactionGroupId;
  }

  public static async getSystemAccountId(client: PoolClient, identifier: string): Promise<string> {
    const res = await client.query(
      `SELECT id FROM ledger_accounts WHERE account_identifier = $1`,
      [identifier]
    );
    if (res.rows.length === 0) {
      throw new Error(`System ledger account not initialized: ${identifier}`);
    }
    return res.rows[0].id;
  }

  public static async getUserAccountId(client: PoolClient, userId: string): Promise<string> {
    const res = await client.query(
      `SELECT id FROM ledger_accounts WHERE user_id = $1`,
      [userId]
    );
    if (res.rows.length === 0) {
      throw new Error(`No ledger wallet configured for user: ${userId}`);
    }
    return res.rows[0].id;
  }
}