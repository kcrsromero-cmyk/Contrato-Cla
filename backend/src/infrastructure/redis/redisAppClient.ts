import Redis from 'ioredis';
import { logger } from '../logger';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redisAppClient = new Redis(redisUrl, {
  maxRetriesPerRequest: 1,
  enableReadyCheck: false,
});

redisAppClient.on('error', (err) => {
  logger.error('Redis app client error', { message: err.message });
});
