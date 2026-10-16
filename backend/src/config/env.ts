import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_SECRET: z.string().min(16),
  MEGAPAY_API_BASE_URL: z.string().url(),
  MEGAPAY_API_KEY: z.string().min(1),
  MEGAPAY_CLIENT_ID: z.string().min(1),
  MEGAPAY_WEBHOOK_SECRET: z.string().min(1),
  MEGAPAY_CALLBACK_URL: z.string().url(),
  THE_ODDS_API_BASE_URL: z.string().url(),
  THE_ODDS_API_KEY: z.string().min(1),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('CRITICAL: Environment variable validation failed:');
  console.error(JSON.stringify(parsedEnv.error.format(), null, 2));
  process.exit(1);
}

export const ENV = parsedEnv.data;