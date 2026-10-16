import axios from 'axios';
import crypto from 'crypto';
import { redisClient } from '../redis/client.js';

export class SmsService {
  private static formatKenyanPhone(phone: string): string {
    const clean = phone.replace(/\D/g, '');
    if (clean.startsWith('254') && clean.length === 12) {
      return `+${clean}`;
    }
    if (clean.startsWith('0') && clean.length === 10) {
      return `+254${clean.slice(1)}`;
    }
    if (clean.startsWith('7') && clean.length === 9) {
      return `+254${clean}`;
    }
    return `+${clean}`;
  }

  /**
   * Generates a 6-digit OTP, stores it in Redis with a 5-minute TTL,
   * and dispatches via Africa's Talking SMS API.
   */
  public static async sendOtp(phoneNumber: string): Promise<{ success: boolean; message: string; mockOtp?: string }> {
    const formattedPhone = this.formatKenyanPhone(phoneNumber);
    const otp = crypto.randomInt(100000, 999999).toString();

    // 1. Store OTP in Redis with 300-second (5 min) expiration
    const redisKey = `kyc:otp:${formattedPhone}`;
    await redisClient.set(redisKey, otp, 'EX', 300);

    const apiKey = process.env.AFRICASTALKING_API_KEY;
    const username = process.env.AFRICASTALKING_USERNAME || 'sandbox';

    // 2. Sandbox / Mock Mode Fallback for local development
    if (!apiKey || apiKey === 'placeholder_africastalking_key' || username === 'sandbox') {
      console.log(`\n======================================================`);
      console.log(`[SMS KYC GATEWAY] SMS Dispatched to: ${formattedPhone}`);
      console.log(`[SMS KYC GATEWAY] Verification Code: ${otp}`);
      console.log(`[SMS KYC GATEWAY] Valid for: 5 minutes`);
      console.log(`======================================================\n`);
      return {
        success: true,
        message: 'Verification code generated (Sandbox Console Mode)',
        mockOtp: otp,
      };
    }

    // 3. Live Africa's Talking Production Gateway
    try {
      const url = 'https://api.africastalking.com/version1/messaging';
      const body = new URLSearchParams({
        username,
        to: formattedPhone,
        message: `Your BetPoake KYC verification code is ${otp}. Valid for 5 minutes. Do not share this code.`,
      });

      if (process.env.AFRICASTALKING_SENDER_ID) {
        body.append('from', process.env.AFRICASTALKING_SENDER_ID);
      }

      const response = await axios.post(url, body.toString(), {
        headers: {
          apiKey,
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        timeout: 10000,
      });

      const recipient = response.data?.SMSMessageData?.Recipients?.[0];
      if (recipient?.status === 'Success') {
        return { success: true, message: 'Verification SMS sent.' };
      } else {
        return { success: false, message: recipient?.status || 'SMS Delivery Failure' };
      }
    } catch (err: any) {
      console.error('AfricaTalking SMS Gateway Error:', err.response?.data || err.message);
      return { success: false, message: 'Failed to send SMS OTP via carrier' };
    }
  }

  /**
   * Validates OTP from Redis. Once verified, the key is burned immediately.
   */
  public static async verifyOtp(phoneNumber: string, submittedOtp: string): Promise<boolean> {
    const formattedPhone = this.formatKenyanPhone(phoneNumber);
    const redisKey = `kyc:otp:${formattedPhone}`;
    const storedOtp = await redisClient.get(redisKey);

    if (!storedOtp) return false;

    if (storedOtp === submittedOtp.trim()) {
      // Burn OTP immediately to eliminate replay attacks
      await redisClient.del(redisKey);
      return true;
    }

    return false;
  }
}
