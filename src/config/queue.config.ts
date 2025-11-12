import { registerAs } from '@nestjs/config';

export default registerAs('queue', () => ({
  redis: {
    host: process.env.QUEUE_REDIS_HOST || process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.QUEUE_REDIS_PORT || process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
  },
  concurrency: parseInt(process.env.QUEUE_CONCURRENCY, 10) || 5,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      age: 24 * 3600, // 24 hours
      count: 1000,
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // 7 days
    },
  },
}));
