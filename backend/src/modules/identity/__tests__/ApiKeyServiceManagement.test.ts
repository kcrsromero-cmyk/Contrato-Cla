import { createHash } from 'node:crypto';
import { describe, it, expect, vi } from 'vitest';
import { ApiKeyService } from '../application/ApiKeyService';
import { API_KEY_PATTERN } from '../domain/ApiKey';
import { ApiKeyLimitExceededError, ApiKeyNotFoundError } from '../domain/errors';

vi.mock('../../../infrastructure/redis/RedisCacheAdapter', () => ({
  RedisCacheAdapter: class {
    async get() { return null; }
    async set() {}
  },
}));

const NOW = new Date('2026-12-01T00:00:00.000Z');

function buildClient() {
  const client: any = {
    apiKey: { create: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), update: vi.fn(), count: vi.fn() },
    plan: { findUnique: vi.fn() },
    user: { findUnique: vi.fn(async () => ({ plan: { maxApiKeys: 10 } })) },
    $executeRaw: vi.fn(),
  };
  client.$transaction = vi.fn((callback: any) => callback(client));
  return client;
}

describe('ApiKeyService.issue', () => {
  it('creates the key with exactly userId, name, keyHash and keyPrefix, and returns the plaintext once', async () => {
    const client = buildClient();
    client.apiKey.count.mockResolvedValue(0);
    client.apiKey.create.mockImplementation(async ({ data }: any) => ({
      id: 'key-1',
      name: 'CI',
      keyPrefix: data.keyPrefix,
      createdAt: NOW,
    }));
    const service = new ApiKeyService(client as any, () => NOW);

    const result = await service.issue('user-1', 'CI');

    const dataKeys = Object.keys(client.apiKey.create.mock.calls[0][0].data).sort();
    expect(dataKeys).toEqual(['keyHash', 'keyPrefix', 'name', 'userId']);
    expect(result.key).toMatch(API_KEY_PATTERN);
    expect(createHash('sha256').update(result.key).digest('hex')).toBe(
      client.apiKey.create.mock.calls[0][0].data.keyHash,
    );
    expect(result.keyPrefix).toBe(result.key.slice(0, 12));
    expect('keyHash' in result).toBe(false);
  });

  it('queries the active-key count by userId before issuing', async () => {
    const client = buildClient();
    client.apiKey.count.mockResolvedValue(3);
    client.apiKey.create.mockImplementation(async ({ data }: any) => ({
      id: 'key-1', name: 'CI', keyPrefix: data.keyPrefix, createdAt: NOW,
    }));
    const service = new ApiKeyService(client as any, () => NOW);

    await service.issue('user-1', 'CI');

    expect(client.apiKey.count).toHaveBeenCalledWith({ where: { userId: 'user-1', revokedAt: null } });
  });

  it("throws ApiKeyLimitExceededError at exactly the user's plan cap, without calling create", async () => {
    const client = buildClient();
    client.apiKey.count.mockResolvedValue(10);
    const service = new ApiKeyService(client as any, () => NOW);

    await expect(service.issue('user-1', 'CI')).rejects.toBeInstanceOf(ApiKeyLimitExceededError);
    expect(client.apiKey.create).not.toHaveBeenCalled();
  });

  it('still allows issuing one below the plan cap', async () => {
    const client = buildClient();
    client.apiKey.count.mockResolvedValue(9);
    client.apiKey.create.mockImplementation(async ({ data }: any) => ({
      id: 'key-1', name: 'CI', keyPrefix: data.keyPrefix, createdAt: NOW,
    }));
    const service = new ApiKeyService(client as any, () => NOW);

    await expect(service.issue('user-1', 'CI')).resolves.toBeDefined();
  });

  it("enforces the user's own plan cap, not a fixed number", async () => {
    const client = buildClient();
    client.user.findUnique.mockResolvedValue({ plan: { maxApiKeys: 2 } });
    client.apiKey.count.mockResolvedValue(2);
    const service = new ApiKeyService(client as any, () => NOW);

    await expect(service.issue('user-1', 'CI')).rejects.toBeInstanceOf(ApiKeyLimitExceededError);
  });

  it('never counts or caps when the plan has maxApiKeys set to null (unlimited)', async () => {
    const client = buildClient();
    client.user.findUnique.mockResolvedValue({ plan: { maxApiKeys: null } });
    client.apiKey.create.mockImplementation(async ({ data }: any) => ({
      id: 'key-1', name: 'CI', keyPrefix: data.keyPrefix, createdAt: NOW,
    }));
    const service = new ApiKeyService(client as any, () => NOW);

    await expect(service.issue('user-1', 'CI')).resolves.toBeDefined();
    expect(client.apiKey.count).not.toHaveBeenCalled();
  });

  it('falls back to the default cap when the user has no plan row', async () => {
    const client = buildClient();
    client.user.findUnique.mockResolvedValue({ plan: null });
    client.apiKey.count.mockResolvedValue(10);
    const service = new ApiKeyService(client as any, () => NOW);

    await expect(service.issue('user-1', 'CI')).rejects.toBeInstanceOf(ApiKeyLimitExceededError);
  });
});

describe('ApiKeyService.listForUser', () => {
  it('queries by userId ordered by createdAt desc, selecting only the summary fields', async () => {
    const client = buildClient();
    client.apiKey.findMany.mockResolvedValue([]);
    const service = new ApiKeyService(client as any, () => NOW);

    await service.listForUser('user-1');

    expect(client.apiKey.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, keyPrefix: true, createdAt: true, lastUsedAt: true, revokedAt: true },
    });
  });
});

describe('ApiKeyService.revoke', () => {
  it('throws ApiKeyNotFoundError and does not update when the key does not exist or belongs to another user', async () => {
    const client = buildClient();
    client.apiKey.findFirst.mockResolvedValue(null);
    const service = new ApiKeyService(client as any, () => NOW);

    await expect(service.revoke('user-1', 'key-x')).rejects.toBeInstanceOf(ApiKeyNotFoundError);
    expect(client.apiKey.update).not.toHaveBeenCalled();
    expect(client.apiKey.findFirst).toHaveBeenCalledWith({
      where: { id: 'key-x', userId: 'user-1' },
      select: { id: true, name: true, keyPrefix: true, createdAt: true, lastUsedAt: true, revokedAt: true },
    });
  });

  it('revokes an active key, setting revokedAt to the clock time', async () => {
    const client = buildClient();
    const existing = { id: 'key-1', name: 'CI', keyPrefix: 'ctr360_AAAA', createdAt: NOW, lastUsedAt: null, revokedAt: null };
    const updated = { ...existing, revokedAt: NOW };
    client.apiKey.findFirst.mockResolvedValue(existing);
    client.apiKey.update.mockResolvedValue(updated);
    const service = new ApiKeyService(client as any, () => NOW);

    const result = await service.revoke('user-1', 'key-1');

    expect(client.apiKey.update).toHaveBeenCalledWith({
      where: { id: 'key-1' },
      data: { revokedAt: NOW },
      select: { id: true, name: true, keyPrefix: true, createdAt: true, lastUsedAt: true, revokedAt: true },
    });
    expect(result).toEqual(updated);
  });

  it('returns the existing summary and does not update when the key is already revoked', async () => {
    const client = buildClient();
    const existing = {
      id: 'key-1',
      name: 'CI',
      keyPrefix: 'ctr360_AAAA',
      createdAt: NOW,
      lastUsedAt: null,
      revokedAt: new Date('2026-11-30T00:00:00.000Z'),
    };
    client.apiKey.findFirst.mockResolvedValue(existing);
    const service = new ApiKeyService(client as any, () => NOW);

    const result = await service.revoke('user-1', 'key-1');

    expect(result).toEqual(existing);
    expect(client.apiKey.update).not.toHaveBeenCalled();
  });
});
