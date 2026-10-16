import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { dbPool, withTransaction } from '../db/connection.js';
import { MegaPayService } from '../services/megapay.service.js';
import { LedgerService } from '../services/ledger.service.js';

export async function paymentsRoutes(server: FastifyInstance) {
  // STK Push Request
  server.post('/deposit/stk-push', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Authentication required' });
    }

    const user = request.user as { id: string };
    const schema = z.object({
      phoneNumber: z.string().min(9),
      amountKes: z.number().int().min(10).max(150000),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid payload', details: parsed.error.format() });
    }

    const { phoneNumber, amountKes } = parsed.data;
    const amountMicroUnits = BigInt(amountKes * 100);

    const txRes = await dbPool.query(
      `INSERT INTO payment_transactions (user_id, direction, phone_number, amount_micro_units, status)
       VALUES ($1, 'C2B', $2, $3, 'PENDING')
       RETURNING id`,
      [user.id, phoneNumber, amountMicroUnits.toString()]
    );
    const internalReferenceId = txRes.rows[0].id;

    const gatewayRes = await MegaPayService.initiateStkPush({
      phoneNumber,
      amountKes,
      referenceId: internalReferenceId,
    });

    if (!gatewayRes.success) {
      await dbPool.query(
        `UPDATE payment_transactions SET status = 'FAILED', raw_payload = $1 WHERE id = $2`,
        [JSON.stringify(gatewayRes.raw), internalReferenceId]
      );
      return reply.status(502).send({ error: gatewayRes.responseMessage });
    }

    await dbPool.query(
      `UPDATE payment_transactions 
       SET checkout_request_id = $1, raw_payload = $2, updated_at = NOW()
       WHERE id = $3`,
      [gatewayRes.checkoutRequestId, JSON.stringify(gatewayRes.raw), internalReferenceId]
    );

    return reply.send({
      success: true,
      referenceId: internalReferenceId,
      checkoutRequestId: gatewayRes.checkoutRequestId,
      message: 'STK prompt dispatched to M-Pesa line.',
    });
  });

  // Asynchronous Webhook Callback
  server.post('/megapay-callback', async (request, reply) => {
    const rawBody = JSON.stringify(request.body);
    const signature = request.headers['x-megapay-signature'] as string;

    const isValid = MegaPayService.verifyWebhookSignature(rawBody, signature);
    if (!isValid && process.env.NODE_ENV === 'production') {
      return reply.status(403).send({ error: 'Webhook signature validation failure' });
    }

    const body: any = request.body;
    const checkoutRequestId = body?.CheckoutRequestID || body?.checkout_id;
    const resultCode = body?.ResultCode ?? body?.status_code;
    const providerReference = body?.MpesaReceiptNumber || body?.transaction_reference || `MP_${Date.now()}`;

    if (!checkoutRequestId) {
      return reply.status(400).send({ error: 'Missing checkout identifier' });
    }

    if (resultCode === 0 || body?.status === 'SUCCESS') {
      await withTransaction(async (client) => {
        const tx = await client.query(
          `SELECT id, user_id, amount_micro_units, status 
           FROM payment_transactions 
           WHERE checkout_request_id = $1 OR id::text = $1
           FOR UPDATE`,
          [checkoutRequestId]
        );

        if (tx.rows.length === 0 || tx.rows[0].status === 'COMPLETED') {
          return;
        }

        const paymentRow = tx.rows[0];
        const amountMicro = BigInt(paymentRow.amount_micro_units);

        const gatewayFloatAccountId = await LedgerService.getSystemAccountId(client, 'SYSTEM_GATEWAY_FLOAT');
        const userWalletId = await LedgerService.getUserAccountId(client, paymentRow.user_id);

        // Atomic Double Entry Balance Credit
        await LedgerService.executeDoubleEntry(client, [
          {
            accountId: gatewayFloatAccountId,
            entryType: 'DEBIT',
            amountMicroUnits: amountMicro,
            category: 'DEPOSIT',
            referenceId: providerReference,
          },
          {
            accountId: userWalletId,
            entryType: 'CREDIT',
            amountMicroUnits: amountMicro,
            category: 'DEPOSIT',
            referenceId: providerReference,
          },
        ]);

        await client.query(
          `UPDATE payment_transactions 
           SET status = 'COMPLETED', provider_reference = $1, raw_payload = $2, updated_at = NOW() 
           WHERE id = $3`,
          [providerReference, rawBody, paymentRow.id]
        );
      });
    } else {
      await dbPool.query(
        `UPDATE payment_transactions SET status = 'FAILED', raw_payload = $1, updated_at = NOW()
         WHERE checkout_request_id = $2`,
        [rawBody, checkoutRequestId]
      );
    }

    return reply.send({ received: true });
  });

  // B2C Instant Withdrawal Controller
  server.post('/withdraw/b2c', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const user = request.user as { id: string };
    const schema = z.object({
      phoneNumber: z.string().min(9),
      amountKes: z.number().int().min(50).max(70000),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid parameters', details: parsed.error.format() });
    }

    const { phoneNumber, amountKes } = parsed.data;
    const amountMicroUnits = BigInt(amountKes * 100);

    try {
      const payoutRes = await withTransaction(async (client) => {
        const userWalletId = await LedgerService.getUserAccountId(client, user.id);
        const gatewayFloatAccountId = await LedgerService.getSystemAccountId(client, 'SYSTEM_GATEWAY_FLOAT');

        const txRes = await client.query(
          `INSERT INTO payment_transactions (user_id, direction, phone_number, amount_micro_units, status)
           VALUES ($1, 'B2C', $2, $3, 'PROCESSING')
           RETURNING id`,
          [user.id, phoneNumber, amountMicroUnits.toString()]
        );
        const payoutId = txRes.rows[0].id;

        // Debit User Wallet; Credit System Gateway Float Account
        await LedgerService.executeDoubleEntry(client, [
          {
            accountId: userWalletId,
            entryType: 'DEBIT',
            amountMicroUnits: amountMicroUnits,
            category: 'WITHDRAWAL',
            referenceId: `WITHDRAWAL_INIT_${payoutId}`,
          },
          {
            accountId: gatewayFloatAccountId,
            entryType: 'CREDIT',
            amountMicroUnits: amountMicroUnits,
            category: 'WITHDRAWAL',
            referenceId: `WITHDRAWAL_FLOAT_${payoutId}`,
          },
        ]);

        return payoutId;
      });

      const b2cResponse = await MegaPayService.executeB2CPayout({
        phoneNumber,
        amountKes,
        payoutId: payoutRes,
      });

      if (!b2cResponse.success) {
        throw new Error(b2cResponse.message);
      }

      await dbPool.query(
        `UPDATE payment_transactions 
         SET status = 'COMPLETED', provider_reference = $1, updated_at = NOW() 
         WHERE id = $2`,
        [b2cResponse.externalReference, payoutRes]
      );

      return reply.send({ success: true, message: 'Withdrawal dispatched to M-Pesa line.' });
    } catch (err: any) {
      return reply.status(400).send({ error: err.message || 'Withdrawal rejected' });
    }
  });
}