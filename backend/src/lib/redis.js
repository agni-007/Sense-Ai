import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// ioredis client singleton
// Note: BullMQ requires maxRetriesPerRequest to be null on the Redis connection
export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
});

redis.on('connect', () => {
  console.log('🔌 Connected to Redis');
});

redis.on('error', (err) => {
  console.error('❌ Redis connection error:', err);
});
