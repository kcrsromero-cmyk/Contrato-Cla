import { RedisStore } from 'rate-limit-redis';
import { MemoryStore, Store } from 'express-rate-limit';
import { logger } from '../logger';
import Redis from 'ioredis';

export class FallbackRedisStore implements Store {
  private redisStore: RedisStore;
  private memoryStore: MemoryStore;
  private redisClient: Redis;
  private isRedisWarned: boolean = false;

  constructor(client: Redis, prefix: string) {
    this.redisClient = client;
    this.memoryStore = new MemoryStore();
    this.redisStore = new RedisStore({
      sendCommand: async (...args: string[]) => {
          return await client.call(args[0], ...args.slice(1));
      },
      prefix: prefix
    });
  }

  private isRedisAvailable(): boolean {
    return this.redisClient.status === 'ready';
  }

  private handleRedisError(error: any) {
    if (!this.isRedisWarned) {
      logger.warn('Redis not available for rate limiting, falling back to MemoryStore', { error: error.message });
      this.isRedisWarned = true; // Log only once to avoid flooding
    }
  }

  async increment(key: string): Promise<any> {
    if (this.isRedisAvailable()) {
      try {
        return await this.redisStore.increment(key);
      } catch (error) {
        this.handleRedisError(error);
        return await this.memoryStore.increment(key);
      }
    } else {
      this.handleRedisError(new Error('Redis client not ready'));
      return await this.memoryStore.increment(key);
    }
  }

  async decrement(key: string): Promise<void> {
    if (this.isRedisAvailable()) {
      try {
        await this.redisStore.decrement(key);
      } catch (error) {
        this.handleRedisError(error);
        await this.memoryStore.decrement(key);
      }
    } else {
      this.handleRedisError(new Error('Redis client not ready'));
      await this.memoryStore.decrement(key);
    }
  }

  async resetKey(key: string): Promise<void> {
    if (this.isRedisAvailable()) {
      try {
        await this.redisStore.resetKey(key);
      } catch (error) {
        this.handleRedisError(error);
        await this.memoryStore.resetKey(key);
      }
    } else {
      this.handleRedisError(new Error('Redis client not ready'));
      await this.memoryStore.resetKey(key);
    }
  }

  init(options: any): void {
    if (this.memoryStore.init) {
      this.memoryStore.init(options);
    }
    if (this.redisStore.init) {
      this.redisStore.init(options);
    }
  }
}
