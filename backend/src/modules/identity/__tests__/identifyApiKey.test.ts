import { describe, it, expect, vi, beforeEach } from 'vitest';

const state = vi.hoisted(() => ({
  apiKeyRow: null as any,
  featureEnabled: true,
  redis: new Map<string, number>(),
}));

vi.mock('../../../infrastructure/db/prisma', () => ({
  prisma: {
    apiKey: {
      findUnique: vi.fn(async () => state.apiKeyRow),
      update: vi.fn(async () => ({})),
    },
    plan: { findUnique: vi.fn(async () => null) },
  },
}));

vi.mock('../../platform/presentation/requireFeatureEnabled', () => ({
  checkFeatureEnabled: vi.fn(async () => state.featureEnabled),
}));

vi.mock('../../../infrastructure/redis/RedisCacheAdapter', () => ({
  RedisCacheAdapter: class {
    async get(key: string) { return state.redis.has(key) ? String(state.redis.get(key)) : null; }
    async set() {}
    async setIfNotExists() { return true; }
    async del(key: string) { state.redis.delete(key); }
    async increment(key: string) {
      const next = (state.redis.get(key) ?? 0) + 1;
      state.redis.set(key, next);
      return next;
    }
  },
}));

vi.mock('../../../infrastructure/redis/redisAppClient', () => ({ redisAppClient: {} }));
vi.mock('../../../infrastructure/security/rateLimitStore', () => ({ FallbackRedisStore: class {} }));
vi.mock('express-rate-limit', () => ({ default: () => (_req: any, _res: any, next: any) => next() }));
vi.mock('../../../infrastructure/logger', () => ({ logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() } }));

import { identifyApiKey } from '../presentation/apiKeyAuth';

const KEY = 'ctr360_' + 'A'.repeat(43);

function ownerRow() {
  return {
    id: 'key-1',
    revokedAt: null,
    user: {
      id: '00000000-0000-0000-0000-0000000000aa',
      email: 'owner@test.com',
      name: null,
      roles: ['USER'],
      phone: null,
      telegramUsername: null,
      notifyEmail: false,
      notifyTelegram: false,
      notifySms: false,
      planExpiresAt: null,
      plan: {
        name: 'BUSINESS',
        maxFavoriteEntities: 25,
        apiRequestsPerMinute: 60,
        capabilities: ['USE_API'].map((name) => ({ capability: { name } })),
      },
    },
  };
}

describe('identifyApiKey', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.apiKeyRow = null;
    state.featureEnabled = true;
    state.redis.clear();
  });

  it('attaches req.apiKey/req.user, sets apiKeyAuthStatus "valid" and calls next() for a valid key', async () => {
    state.apiKeyRow = ownerRow();
    const req: any = { headers: { authorization: 'Bearer ' + KEY }, ip: '1.2.3.4' };
    const next = vi.fn();

    await identifyApiKey(req, {} as any, next);

    expect(req.apiKey).toEqual({ id: 'key-1', apiRequestsPerMinute: 60 });
    expect(req.user.id).toBe('00000000-0000-0000-0000-0000000000aa');
    expect(req.apiKeyAuthStatus).toBe('valid');
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('leaves req.apiKey unset, sets apiKeyAuthStatus "invalid" and calls next() for a key that does not exist', async () => {
    state.apiKeyRow = null;
    const req: any = { headers: { authorization: 'Bearer ' + KEY }, ip: '1.2.3.4' };
    const next = vi.fn();

    await identifyApiKey(req, {} as any, next);

    expect(req.apiKey).toBeUndefined();
    expect(req.user).toBeUndefined();
    expect(req.apiKeyAuthStatus).toBe('invalid');
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('sets apiKeyAuthStatus "forbidden" (and does not count it as a failure) when the plan lacks USE_API', async () => {
    state.apiKeyRow = {
      ...ownerRow(),
      user: { ...ownerRow().user, plan: { ...ownerRow().user.plan, capabilities: [] } },
    };
    const req: any = { headers: { authorization: 'Bearer ' + KEY }, ip: '1.2.3.4' };
    const next = vi.fn();

    await identifyApiKey(req, {} as any, next);

    expect(req.apiKeyAuthStatus).toBe('forbidden');
    expect(next).toHaveBeenCalledTimes(1);
    expect(state.redis.get('apikey:auth-failures:1.2.3.4')).toBeUndefined();
  });

  it('fast-fails without querying Postgres once an IP has too many recent invalid attempts', async () => {
    state.apiKeyRow = null;
    const req = () => ({ headers: { authorization: 'Bearer ' + KEY }, ip: '9.9.9.9' } as any);
    const { prisma } = await import('../../../infrastructure/db/prisma');

    for (let i = 0; i < 20; i++) {
      await identifyApiKey(req(), {} as any, vi.fn());
    }
    expect(prisma.apiKey.findUnique).toHaveBeenCalledTimes(20);

    vi.mocked(prisma.apiKey.findUnique).mockClear();
    const lastReq: any = req();
    const next = vi.fn();
    await identifyApiKey(lastReq, {} as any, next);

    expect(prisma.apiKey.findUnique).not.toHaveBeenCalled();
    expect(lastReq.apiKeyAuthStatus).toBe('invalid');
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('never trips the failure counter for a different, well-behaved IP', async () => {
    state.apiKeyRow = ownerRow();
    const req: any = { headers: { authorization: 'Bearer ' + KEY }, ip: '5.5.5.5' };
    const next = vi.fn();

    for (let i = 0; i < 30; i++) {
      await identifyApiKey({ ...req }, {} as any, next);
    }

    expect(next).toHaveBeenCalledTimes(30);
    expect(state.redis.get('apikey:auth-failures:5.5.5.5')).toBeUndefined();
  });

  it('leaves req.apiKey unset and calls next() when there is no Authorization header', async () => {
    const req: any = { headers: {} };
    const next = vi.fn();

    await identifyApiKey(req, {} as any, next);

    expect(req.apiKey).toBeUndefined();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('leaves req.apiKey unset and calls next() for a session JWT (not API-key shaped)', async () => {
    const req: any = { headers: { authorization: 'Bearer some.jwt.token' } };
    const next = vi.fn();

    await identifyApiKey(req, {} as any, next);

    expect(req.apiKey).toBeUndefined();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('never authenticates and calls next() when API_ACCESS is disabled', async () => {
    state.featureEnabled = false;
    state.apiKeyRow = ownerRow();
    const req: any = { headers: { authorization: 'Bearer ' + KEY } };
    const next = vi.fn();
    const { prisma } = await import('../../../infrastructure/db/prisma');

    await identifyApiKey(req, {} as any, next);

    expect(req.apiKey).toBeUndefined();
    expect(prisma.apiKey.findUnique).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('calls next() instead of hanging or throwing when checkFeatureEnabled rejects', async () => {
    const { checkFeatureEnabled } = await import('../../platform/presentation/requireFeatureEnabled');
    vi.mocked(checkFeatureEnabled).mockRejectedValueOnce(new Error('db down'));
    const req: any = { headers: { authorization: 'Bearer ' + KEY } };
    const next = vi.fn();

    await identifyApiKey(req, {} as any, next);

    expect(req.apiKey).toBeUndefined();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('sets apiKeyAuthStatus "unavailable" (and does not count it as a failure) for an unexpected error', async () => {
    const { prisma } = await import('../../../infrastructure/db/prisma');
    vi.mocked(prisma.apiKey.findUnique).mockRejectedValueOnce(new Error('connection reset'));
    const req: any = { headers: { authorization: 'Bearer ' + KEY }, ip: '1.2.3.4' };
    const next = vi.fn();

    await identifyApiKey(req, {} as any, next);

    expect(req.apiKey).toBeUndefined();
    expect(req.apiKeyAuthStatus).toBe('unavailable');
    expect(state.redis.get('apikey:auth-failures:1.2.3.4')).toBeUndefined();
    expect(next).toHaveBeenCalledTimes(1);
  });
});
