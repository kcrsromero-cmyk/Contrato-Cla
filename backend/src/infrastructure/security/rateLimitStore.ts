import { RedisStore } from 'rate-limit-redis';
import { MemoryStore, Store } from 'express-rate-limit';
import { logger } from '../logger';
import Redis from 'ioredis';

/**
 * Rate limit store con fallback de Redis a MemoryStore.
 *
 * COMPORTAMIENTO EN MODO NORMAL (Redis disponible):
 * Los contadores son compartidos entre todas las instancias del proceso
 * a través de Redis. El límite configurado (max) aplica de forma
 * distribuida sobre todos los procesos.
 *
 * COMPORTAMIENTO EN MODO FALLBACK (Redis no disponible):
 * Cada proceso usa su propio MemoryStore. Con N instancias en ejecución,
 * el límite efectivo es max × N por ventana de tiempo.
 * Este comportamiento es intencional: el objetivo del fallback es mantener
 * protección básica y disponibilidad, no equivalencia exacta con Redis.
 *
 * El fallback es transitorio: cuando Redis se recupera, el store vuelve
 * automáticamente a Redis en la siguiente request.
 */
export class FallbackRedisStore implements Store {
  private redisStore: RedisStore;
  private memoryStore: MemoryStore;
  private redisClient: Redis;
  private isRedisWarned: boolean = false;
  private wasUsingFallback: boolean = false;

  constructor(client: Redis, public readonly prefix: string) {
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
    const ready = this.redisClient.status === 'ready';

    if (ready && this.wasUsingFallback) {
      // Redis se recuperó — loguear recuperación y resetear estado
      logger.info('Redis rate limiting recovered — switching back from MemoryStore', {
        prefix: this.prefix
      });
      this.wasUsingFallback = false;
      this.isRedisWarned = false; // permitir warning en próxima caída
    }

    return ready;
  }

  private handleRedisError(error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    if (!this.isRedisWarned) {
      logger.warn('Redis not available for rate limiting, falling back to MemoryStore', {
        error: msg
      });
      this.isRedisWarned = true;
      this.wasUsingFallback = true;
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
