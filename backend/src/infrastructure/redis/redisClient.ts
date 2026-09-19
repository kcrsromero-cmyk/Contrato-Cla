import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redisClient = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
});

redisClient.on('error', (_err) => {
  // Silent catch to prevent unhandled error events when Redis is offline or reconnecting
});
