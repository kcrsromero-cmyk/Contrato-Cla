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

  it('should warn only once while Redis stays unavailable', async () => {
    const store = new FallbackRedisStore(redisAppClient, 'rl:test:');
    Object.defineProperty(redisAppClient, 'status', { value: 'reconnecting', configurable: true });

    await store.increment('ip-1');
    await store.increment('ip-1');
    await store.increment('ip-1');

    expect(logger.warn).toHaveBeenCalledTimes(1);
  });

  it('should return to RedisStore after Redis recovers', async () => {
    const store = new FallbackRedisStore(redisAppClient, 'rl:test:');

    // Redis unavailable initially
    Object.defineProperty(redisAppClient, 'status', { value: 'reconnecting', configurable: true });
    await store.increment('ip-fallback'); // triggers fallback

    // Recover Redis
    Object.defineProperty(redisAppClient, 'status', { value: 'ready', configurable: true });

    const incrementSpy = vi.spyOn(RedisStore.prototype, 'increment').mockResolvedValue({
        totalHits: 2,
        resetTime: new Date()
    });

    await store.increment('ip-fallback'); // Should use RedisStore now

    expect(incrementSpy).toHaveBeenCalled();
  });

  it('should log recovery when Redis comes back, and warn again on second outage', async () => {
    const store = new FallbackRedisStore(redisAppClient, 'rl:test:');

    // Outage 1
    Object.defineProperty(redisAppClient, 'status', { value: 'reconnecting', configurable: true });
    await store.increment('ip-1');
    expect(logger.warn).toHaveBeenCalledTimes(1);

    // Recovery
    Object.defineProperty(redisAppClient, 'status', { value: 'ready', configurable: true });
    vi.spyOn(RedisStore.prototype, 'increment').mockResolvedValue({ totalHits: 1, resetTime: new Date() });
    await store.increment('ip-1');
    expect(logger.info).toHaveBeenCalledWith(
        'Redis rate limiting recovered — switching back from MemoryStore',
        { prefix: 'rl:test:' }
    );

    // Outage 2
    Object.defineProperty(redisAppClient, 'status', { value: 'reconnecting', configurable: true });
    await store.increment('ip-1');
    expect(logger.warn).toHaveBeenCalledTimes(2);
  });

  it('should NOT log warning on decrement when already warned from increment', async () => {
    const store = new FallbackRedisStore(redisAppClient, 'rl:test:');
    Object.defineProperty(redisAppClient, 'status', { value: 'reconnecting', configurable: true });

    await store.increment('ip-x'); // Warns
    await store.decrement('ip-x'); // Should NOT warn again

    expect(logger.warn).toHaveBeenCalledTimes(1);
  });
});
