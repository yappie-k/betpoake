import { PoolClient } from 'pg';
import { dbPool, withTransaction } from '../db/connection.js';
import { LedgerService } from './ledger.service.js';

export class SettlementService {
  /**
   * Evaluates pending bets once a fixture moves to 'COMPLETED'.
   * Applies Kenyan 5% regulatory withholding tax on net winnings.
   * Net win = (Payout - Stake). Tax = Net Win * 0.05.
   */
  public static async settleCompletedFixture(
    fixtureId: string,
    finalHomeScore: number,
    finalAwayScore: number
  ): Promise<void> {
    await withTransaction(async (client: PoolClient) => {
      // 1. Declare winning outcome string
      let winningOutcome: string;
      if (finalHomeScore > finalAwayScore) {
        winningOutcome = 'HOME';
      } else if (finalAwayScore > finalHomeScore) {
        winningOutcome = 'AWAY';
      } else {
        winningOutcome = 'DRAW';
      }

      // 2. Fetch pending bet legs linked to this fixture
      const legsRes = await client.query(
        `SELECT bl.id as leg_id, bl.bet_id, bl.selected_outcome, b.user_id, 
                b.total_stake_micro_units, b.potential_payout_micro_units, b.status as bet_status
         FROM bet_legs bl
         JOIN markets m ON bl.market_id = m.id
         JOIN bets b ON bl.bet_id = b.id
         WHERE m.fixture_id = $1 AND bl.status = 'PENDING'
         FOR UPDATE OF b`,
        [fixtureId]
      );

      const escrowAccountId = await LedgerService.getSystemAccountId(client, 'SYSTEM_ESCROW');
      const taxLedgerAccountId = await LedgerService.getSystemAccountId(client, 'TAX_WITHHOLDING_ACCOUNT');
      const houseRevenueAccountId = await LedgerService.getSystemAccountId(client, 'SYSTEM_HOUSE_REVENUE');

      for (const row of legsRes.rows) {
        const betId = row.bet_id;
        const userId = row.user_id;
        const totalStake = BigInt(row.total_stake_micro_units);
        const grossPayout = BigInt(row.potential_payout_micro_units);
        const userWalletId = await LedgerService.getUserAccountId(client, userId);

        const isWin = row.selected_outcome === winningOutcome;

        if (isWin) {
          // Calculate Net Winnings
          const netWin = grossPayout > totalStake ? grossPayout - totalStake : 0n;

          // 5% Kenyan Withholding Tax on Net Winnings
          const taxWithholding = (netWin * 5n) / 100n;
          const netUserDisbursement = grossPayout - taxWithholding;

          // Postings: Debit Escrow full gross payout; Credit user net disbursement; Credit tax ledger
          await LedgerService.executeDoubleEntry(client, [
            {
              accountId: escrowAccountId,
              entryType: 'DEBIT',
              amountMicroUnits: grossPayout,
              category: 'WAGER_PAYOUT',
              referenceId: `WIN_PAYOUT_BET_${betId}`,
            },
            {
              accountId: userWalletId,
              entryType: 'CREDIT',
              amountMicroUnits: netUserDisbursement,
              category: 'WAGER_PAYOUT',
              referenceId: `WIN_DISBURSE_${betId}`,
            },
            {
              accountId: taxLedgerAccountId,
              entryType: 'CREDIT',
              amountMicroUnits: taxWithholding,
              category: 'TAX_WITHHOLDING',
              referenceId: `KRA_TAX_5PCT_${betId}`,
            },
          ]);

          await client.query(
            `UPDATE bets 
             SET status = 'WON', tax_withheld_micro_units = $1, settled_at = NOW() 
             WHERE id = $2`,
            [taxWithholding.toString(), betId]
          );

          await client.query(`UPDATE bet_legs SET status = 'WON' WHERE id = $1`, [row.leg_id]);
        } else {
          // Bet Lost: Escrow funds move to House Revenue
          await LedgerService.executeDoubleEntry(client, [
            {
              accountId: escrowAccountId,
              entryType: 'DEBIT',
              amountMicroUnits: totalStake,
              category: 'HOUSE_REVENUE',
              referenceId: `BET_LOST_ESCROW_RELEASE_${betId}`,
            },
            {
              accountId: houseRevenueAccountId,
              entryType: 'CREDIT',
              amountMicroUnits: totalStake,
              category: 'HOUSE_REVENUE',
              referenceId: `BET_LOST_HOUSE_PROFIT_${betId}`,
            },
          ]);

          await client.query(
            `UPDATE bets SET status = 'LOST', settled_at = NOW() WHERE id = $1`,
            [betId]
          );

          await client.query(`UPDATE bet_legs SET status = 'LOST' WHERE id = $1`, [row.leg_id]);
        }
      }
    });
  }
}