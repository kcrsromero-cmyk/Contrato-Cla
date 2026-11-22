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

  /**
   * `INCR` + `EXPIRE` sent together in one `MULTI`/`EXEC` round trip, so a dropped connection
   * can never leave the counter incremented with no TTL (the separate-calls version could lose
   * the `EXPIRE` and leak a key that never expires). The window slides on every call rather
   * than being fixed from the first hit — fine for a counter this is meant to feed into an
   * alert, not to gate a decision.
   */
  async increment(key: string, ttlSeconds: number): Promise<number> {
    const results = await this.redis.multi().incr(key).expire(key, ttlSeconds).exec();
    const count = results?.[0]?.[1];
    return typeof count === 'number' ? count : 0;
  }

  async ping(): Promise<string> {
    return this.redis.ping();
  }
}
