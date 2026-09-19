import Redis from 'ioredis';
import { redisClient } from './redisClient';

export class RedisCacheAdapter {
  private redis: Redis;

  constructor(redisInstance?: Redis) {
    this.redis = redisInstance || redisClient;
  }

  async get(key: string): Promise<string | null> {
    return this.redis.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.redis.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.redis.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async ping(): Promise<string> {
    return this.redis.ping();
  }

  async disconnect(): Promise<void> {
    await this.redis.quit();
  }
}
