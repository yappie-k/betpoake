import axios from 'axios';
import crypto from 'crypto';
import { ENV } from '../config/env.js';

export interface MegaPayStkRequest {
  phoneNumber: string;
  amountKes: number;
  referenceId: string;
}

export interface MegaPayStkResponse {
  success: boolean;
  checkoutRequestId?: string;
  responseMessage?: string;
  raw: unknown;
}

export class MegaPayService {
  private static formatKenyanPhone(phone: string): string {
    const clean = phone.replace(/\D/g, '');
    if (clean.startsWith('254') && clean.length === 12) {
      return clean;
    }
    if (clean.startsWith('0') && clean.length === 10) {
      return `254${clean.slice(1)}`;
    }
    if (clean.startsWith('7') && clean.length === 9) {
      return `254${clean}`;
    }
    return clean;
  }

  public static async initiateStkPush(params: MegaPayStkRequest): Promise<MegaPayStkResponse> {
    const formattedPhone = this.formatKenyanPhone(params.phoneNumber);

    // Sandbox Simulation Mode if placeholder keys are active
    if (!ENV.MEGAPAY_API_KEY || ENV.MEGAPAY_API_KEY === 'placeholder_megapay_api_key') {
      const mockCheckoutId = `ws_CO_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
      console.log(`[MegaPay Sandbox Mock] Dispatched STK Push to ${formattedPhone} for KES ${params.amountKes}`);
      return {
        success: true,
        checkoutRequestId: mockCheckoutId,
        responseMessage: 'Success. STK prompt simulated (Sandbox Mock Mode)',
        raw: { CheckoutRequestID: mockCheckoutId, ResponseCode: '0' },
      };
    }

    // Live Payload supporting both email and client_id formats
    const payload = {
      client_id: ENV.MEGAPAY_CLIENT_ID,
      email: ENV.MEGAPAY_CLIENT_ID,
      phone_number: formattedPhone,
      amount: params.amountKes,
      reference: params.referenceId,
      callback_url: ENV.MEGAPAY_CALLBACK_URL,
      timestamp: new Date().toISOString(),
    };

    try {
      const response = await axios.post(
        `${ENV.MEGAPAY_API_BASE_URL}/initiatestk`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${ENV.MEGAPAY_API_KEY}`,
          },
          timeout: 15000,
        }
      );

      return {
        success: true,
        checkoutRequestId: response.data?.CheckoutRequestID || response.data?.checkout_id || params.referenceId,
        responseMessage: response.data?.ResponseDescription || 'STK Push Dispatched',
        raw: response.data,
      };
    } catch (error: any) {
      console.error('MegaPay STK Push Error:', error.response?.data || error.message);
      return {
        success: false,
        responseMessage: error.response?.data?.message || error.message || 'Payment Gateway Failure',
        raw: error.response?.data || null,
      };
    }
  }

  public static verifyWebhookSignature(payload: string, incomingSignature?: string): boolean {
    // If webhook secret is 'none' or not provided, rely on internal CheckoutRequestID validation
    if (
      !incomingSignature ||
      ENV.MEGAPAY_WEBHOOK_SECRET === 'none' ||
      ENV.MEGAPAY_WEBHOOK_SECRET === 'placeholder_signature_secret' ||
      !ENV.MEGAPAY_WEBHOOK_SECRET
    ) {
      return true;
    }

    const computedSignature = crypto
      .createHmac('sha256', ENV.MEGAPAY_WEBHOOK_SECRET)
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(computedSignature, 'utf-8'),
      Buffer.from(incomingSignature, 'utf-8')
    );
  }

  public static async executeB2CPayout(params: {
    phoneNumber: string;
    amountKes: number;
    payoutId: string;
  }): Promise<{ success: boolean; externalReference?: string; message: string }> {
    const formattedPhone = this.formatKenyanPhone(params.phoneNumber);

    if (!ENV.MEGAPAY_API_KEY || ENV.MEGAPAY_API_KEY === 'placeholder_megapay_api_key') {
      const mockTxRef = `B2C_MOCK_${Date.now()}`;
      return {
        success: true,
        externalReference: mockTxRef,
        message: 'Mock payout processed successfully (Sandbox)',
      };
    }

    try {
      const response = await axios.post(
        `${ENV.MEGAPAY_API_BASE_URL}/b2c/transfer`,
        {
          client_id: ENV.MEGAPAY_CLIENT_ID,
          email: ENV.MEGAPAY_CLIENT_ID,
          phone_number: formattedPhone,
          amount: params.amountKes,
          reference: params.payoutId,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${ENV.MEGAPAY_API_KEY}`,
          },
          timeout: 20000,
        }
      );

      return {
        success: response.data?.status === 'SUCCESS' || response.status === 200,
        externalReference: response.data?.transaction_id || response.data?.ConversationID,
        message: 'Payout processed',
      };
    } catch (err: any) {
      console.error('MegaPay B2C API Error:', err.response?.data || err.message);
      return {
        success: false,
        message: err.response?.data?.message || 'B2C Gateway Processing Error',
      };
    }
  }
}
