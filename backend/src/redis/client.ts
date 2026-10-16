import { Redis } from 'ioredis';
import { ENV } from '../config/env.js';

export const redisClient = new Redis(ENV.REDIS_URL, {
  maxRetriesPerRequest: 5,
  retryStrategy(times) {
    return Math.min(times * 100, 3000);
  },
});

export const redisSub = new Redis(ENV.REDIS_URL);

redisClient.on('connect', () => {
  console.log('Redis Primary Engine connection established.');
});

redisClient.on('error', (err) => {
  console.error('Redis Primary Error:', err);
});