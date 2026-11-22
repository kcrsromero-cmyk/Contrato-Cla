import Redis from 'ioredis';
import { redisAppClient } from './redisAppClient';

export class RedisCacheAdapter {
  private redis: Redis;

  constructor(redisInstance?: Redis) {
    this.redis = redisInstance || redisAppClient;
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

  /** Atomic `SET key value NX EX ttlSeconds` — true only for the caller that actually set it. */
  async setIfNotExists(key: string, value: string, ttlSeconds: number): Promise<boolean> {
    const result = await this.redis.set(key, value, 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  /** Atomic `INCR`, setting the TTL only on the first hit so the counter window stays fixed. */
  async increment(key: string, ttlSeconds: number): Promise<number> {
    const count = await this.redis.incr(key);
    if (count === 1) {
      await this.redis.expire(key, ttlSeconds);
    }
    return count;
  }

  async ping(): Promise<string> {
    return this.redis.ping();
  }
}
