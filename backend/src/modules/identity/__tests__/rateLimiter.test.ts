import { describe, it, expect, vi } from 'vitest';
import { RedisStore } from 'rate-limit-redis';
import { redisAppClient } from '../../../infrastructure/redis/redisAppClient';

describe('Persistent Redis Rate Limiter Store', () => {
  it('should instantiate RedisStore with redisAppClient sendCommand wrapper', async () => {
    const callSpy = vi.spyOn(redisAppClient, 'call').mockResolvedValue('OK' as any);

    const store = new RedisStore({
      sendCommand: (...args: string[]) => redisAppClient.call(args[0], ...args.slice(1)) as Promise<any>,
      prefix: 'rl:global:'
    });

    expect(store).toBeDefined();
    expect(store.prefix).toBe('rl:global:');

    // Test sending command through store wrapper
    await store.sendCommand({
      command: ['PING'],
      isReadOnly: true
    });

    expect(callSpy).toHaveBeenCalledWith('PING');
    callSpy.mockRestore();
  });

  it('should support rl:auth: prefix configuration for authentication rate limiting', () => {
    const store = new RedisStore({
      sendCommand: (...args: string[]) => redisAppClient.call(args[0], ...args.slice(1)) as Promise<any>,
      prefix: 'rl:auth:'
    });

    expect(store.prefix).toBe('rl:auth:');
  });
});
