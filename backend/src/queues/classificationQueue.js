import { Queue } from 'bullmq';
import { redis } from '../lib/redis.js';

export const classificationQueue = new Queue('classification', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3, // Auto-retry up to 3 times on job failure
    backoff: {
      type: 'exponential',
      delay: 5000, // Wait 5s before first retry, doubling subsequent waits
    },
  },
});
