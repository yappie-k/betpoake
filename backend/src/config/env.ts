import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),
  DATABASE_URL: z.string().default('postgresql://postgres:password@localhost:5432/betpoake_db'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_SECRET: z.string().default('super_secure_jwt_secret_betpoake_2026_enterprise'),
  MEGAPAY_API_BASE_URL: z.string().default('https://megapay.co.ke'),
  MEGAPAY_API_KEY: z.string().default('placeholder_megapay_api_key'),
  MEGAPAY_CLIENT_ID: z.string().default('placeholder_megapay_client_id'),
  MEGAPAY_WEBHOOK_SECRET: z.string().default('placeholder_signature_secret'),
  MEGAPAY_CALLBACK_URL: z.string().default('https://betpoake-production.up.railway.app/api/v1/payments/megapay-callback'),
  THE_ODDS_API_BASE_URL: z.string().default('https://api.the-odds-api.com'),
  THE_ODDS_API_KEY: z.string().default('placeholder_sports_api_key'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.warn('[Config Warning] Some environment variables had issues, using safe defaults:', parsed.error.format());
}

export const ENV = parsed.success ? parsed.data : envSchema.parse({});
