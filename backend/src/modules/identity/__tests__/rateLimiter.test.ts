import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FallbackRedisStore } from '../../../infrastructure/security/rateLimitStore';
import { redisAppClient } from '../../../infrastructure/redis/redisAppClient';
import { logger } from '../../../infrastructure/logger';
import { RedisStore } from 'rate-limit-redis';

vi.mock('../../../infrastructure/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  }
}));

describe('Persistent Redis Rate Limiter Store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should instantiate FallbackRedisStore with prefix', () => {
    const store = new FallbackRedisStore(redisAppClient, 'rl:global:');
    expect(store).toBeDefined();
  });

  it('should fallback to MemoryStore when Redis is not ready', async () => {
    const store = new FallbackRedisStore(redisAppClient, 'rl:test:');

    // Force status to not be ready
    Object.defineProperty(redisAppClient, 'status', { value: 'reconnecting', configurable: true });

    await store.increment('test-ip');

    expect(logger.warn).toHaveBeenCalledWith(
      'Redis not available for rate limiting, falling back to MemoryStore',
      expect.any(Object)
    );
  });

  it('should fallback to MemoryStore when Redis throws error on increment', async () => {
    const store = new FallbackRedisStore(redisAppClient, 'rl:test:');

    // Force status to be ready
    Object.defineProperty(redisAppClient, 'status', { value: 'ready', configurable: true });

    // Mock the inner redis store to throw an error
    const spy = vi.spyOn(RedisStore.prototype, 'increment').mockRejectedValue(new Error('Redis connection failed'));

    await store.increment('test-ip');

    expect(spy).toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      'Redis not available for rate limiting, falling back to MemoryStore',
      expect.any(Object)
    );
  });
});
