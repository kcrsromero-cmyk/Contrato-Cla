import { createHash } from 'node:crypto';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiKeyService } from '../application/ApiKeyService';
import { ApiAccessNotAllowedError, ApiKeyAuthenticationError } from '../domain/errors';

const redisStore = vi.hoisted(() => ({ map: new Map<string, string>() }));

vi.mock('../../../infrastructure/redis/RedisCacheAdapter', () => ({
  RedisCacheAdapter: class {
    async get(key: string) { return redisStore.map.get(key) ?? null; }
    async set(key: string, value: string) { redisStore.map.set(key, value); }
    async setIfNotExists(key: string, value: string) {
      if (redisStore.map.has(key)) return false;
      redisStore.map.set(key, value);
      return true;
    }
    async del(key: string) { redisStore.map.delete(key); }
  },
}));

const KEY = 'ctr360_' + 'A'.repeat(43);
const OWNER_ID = '00000000-0000-0000-0000-0000000000aa';
const NOW = new Date('2026-12-01T00:00:00.000Z');

const businessOwner = {
  id: OWNER_ID,
  email: 'u@test.com',
  name: 'Ana',
  roles: ['USER'],
  phone: '3001234567',
  telegramUsername: 'ana',
  notifyEmail: true,
  notifyTelegram: false,
  notifySms: false,
  planExpiresAt: null as Date | null,
  plan: {
    name: 'BUSINESS',
    maxFavoriteEntities: 25,
    apiRequestsPerMinute: 60,
    capabilities: ['USE_FAVORITES', 'USE_ANALYTICS', 'USE_API'].map((name) => ({ capability: { name } })),
  } as any,
};

function buildClient() {
  return {
    apiKey: { findUnique: vi.fn(), update: vi.fn(async () => ({})) },
    plan: { findUnique: vi.fn() },
  };
}

describe('ApiKeyService.authenticate', () => {
  it('rejects a malformed key without querying api_keys', async () => {
    const client = buildClient();
    const service = new ApiKeyService(client as any, () => NOW);

    await expect(service.authenticate('ctr360_short')).rejects.toBeInstanceOf(ApiKeyAuthenticationError);
    expect(client.apiKey.findUnique).not.toHaveBeenCalled();
  });

  it('rejects a legacy ck_live_-prefixed key as malformed, without querying api_keys', async () => {
    const client = buildClient();
    const service = new ApiKeyService(client as any, () => NOW);

    await expect(service.authenticate('ck_live_' + 'A'.repeat(43))).rejects.toBeInstanceOf(ApiKeyAuthenticationError);
    expect(client.apiKey.findUnique).not.toHaveBeenCalled();
  });

  it('rejects when no row matches the hash', async () => {
    const client = buildClient();
    client.apiKey.findUnique.mockResolvedValue(null);
    const service = new ApiKeyService(client as any, () => NOW);

    await expect(service.authenticate(KEY)).rejects.toBeInstanceOf(ApiKeyAuthenticationError);
  });

  it('rejects when the matching row is revoked', async () => {
    const client = buildClient();
    client.apiKey.findUnique.mockResolvedValue({
      id: 'key-1',
      revokedAt: new Date('2026-11-30T00:00:00.000Z'),
      user: businessOwner,
    });
    const service = new ApiKeyService(client as any, () => NOW);

    await expect(service.authenticate(KEY)).rejects.toBeInstanceOf(ApiKeyAuthenticationError);
  });

  it('resolves an active BUSINESS key', async () => {
    const client = buildClient();
    client.apiKey.findUnique.mockResolvedValue({ id: 'key-1', revokedAt: null, user: businessOwner });
    const service = new ApiKeyService(client as any, () => NOW);

    const result = await service.authenticate(KEY);

    expect(result.apiKeyId).toBe('key-1');
    expect(result.user.id).toBe(OWNER_ID);
    expect(result.user.plan).toBe('BUSINESS');
    expect(result.user.capabilities).toContain('USE_API');
    expect(result.apiRequestsPerMinute).toBe(60);
    expect(client.apiKey.findUnique).toHaveBeenCalledWith({
      where: { keyHash: createHash('sha256').update(KEY).digest('hex') },
      include: { user: { include: { plan: { include: { capabilities: { include: { capability: true } } } } } } },
    });
  });

  it('rejects when the paid plan expired and the FREE fallback lacks USE_API', async () => {
    const client = buildClient();
    client.apiKey.findUnique.mockResolvedValue({
      id: 'key-1',
      revokedAt: null,
      user: { ...businessOwner, planExpiresAt: new Date('2026-11-01T00:00:00.000Z') },
    });
    client.plan.findUnique.mockResolvedValue({
      name: 'FREE',
      maxFavoriteEntities: 0,
      apiRequestsPerMinute: null,
      capabilities: [{ capability: { name: 'USE_FAVORITES' } }],
    });
    const service = new ApiKeyService(client as any, () => NOW);

    await expect(service.authenticate(KEY)).rejects.toBeInstanceOf(ApiAccessNotAllowedError);
  });

  it('rejects when the active plan lacks USE_API', async () => {
    const client = buildClient();
    client.apiKey.findUnique.mockResolvedValue({
      id: 'key-1',
      revokedAt: null,
      user: {
        ...businessOwner,
        plan: {
          name: 'STARTER',
          maxFavoriteEntities: 3,
          apiRequestsPerMinute: null,
          capabilities: [{ capability: { name: 'USE_FAVORITES' } }],
        },
      },
    });
    const service = new ApiKeyService(client as any, () => NOW);

    await expect(service.authenticate(KEY)).rejects.toBeInstanceOf(ApiAccessNotAllowedError);
  });
});

describe('ApiKeyService.recordUsage', () => {
  beforeEach(() => {
    redisStore.map.clear();
  });

  it("updates the key's lastUsedAt to the injected clock's time", async () => {
    const client = buildClient();
    const service = new ApiKeyService(client as any, () => NOW);

    await service.recordUsage('key-1');

    expect(client.apiKey.update).toHaveBeenCalledWith({ where: { id: 'key-1' }, data: { lastUsedAt: NOW } });
  });

  it('skips the write when called again within the throttle window', async () => {
    const client = buildClient();
    const service = new ApiKeyService(client as any, () => NOW);

    await service.recordUsage('key-1');
    client.apiKey.update.mockClear();
    await service.recordUsage('key-1');

    expect(client.apiKey.update).not.toHaveBeenCalled();
  });

  it('writes again for a different key id', async () => {
    const client = buildClient();
    const service = new ApiKeyService(client as any, () => NOW);

    await service.recordUsage('key-1');
    await service.recordUsage('key-2');

    expect(client.apiKey.update).toHaveBeenCalledTimes(2);
  });

  it('writes exactly once for two concurrent calls on the same key (atomic gate)', async () => {
    const client = buildClient();
    const service = new ApiKeyService(client as any, () => NOW);

    await Promise.all([service.recordUsage('key-1'), service.recordUsage('key-1')]);

    expect(client.apiKey.update).toHaveBeenCalledTimes(1);
  });

  it('releases the throttle gate when the Postgres write fails, so the next call retries', async () => {
    const client = buildClient();
    client.apiKey.update.mockRejectedValueOnce(new Error('db down'));
    const service = new ApiKeyService(client as any, () => NOW);

    await expect(service.recordUsage('key-1')).rejects.toThrow('db down');
    client.apiKey.update.mockResolvedValue({});
    await service.recordUsage('key-1');

    expect(client.apiKey.update).toHaveBeenCalledTimes(2);
  });
});
