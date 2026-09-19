import Redis from 'ioredis';
import { logger } from '../logger';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redisWorkerClient = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

redisWorkerClient.on('error', (err) => {
  logger.error('Redis worker client error', { message: err.message });
});
