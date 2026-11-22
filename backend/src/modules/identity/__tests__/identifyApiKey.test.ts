import { describe, it, expect, vi, beforeEach } from 'vitest';

const state = vi.hoisted(() => ({ apiKeyRow: null as any, featureEnabled: true }));

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
  });

  it('attaches req.apiKey/req.user and calls next() for a valid key', async () => {
    state.apiKeyRow = ownerRow();
    const req: any = { headers: { authorization: 'Bearer ' + KEY } };
    const next = vi.fn();

    await identifyApiKey(req, {} as any, next);

    expect(req.apiKey).toEqual({ id: 'key-1', apiRequestsPerMinute: 60 });
    expect(req.user.id).toBe('00000000-0000-0000-0000-0000000000aa');
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('leaves req.apiKey unset and still calls next() for a key that does not exist', async () => {
    state.apiKeyRow = null;
    const req: any = { headers: { authorization: 'Bearer ' + KEY } };
    const next = vi.fn();

    await identifyApiKey(req, {} as any, next);

    expect(req.apiKey).toBeUndefined();
    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalledTimes(1);
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

  it('calls next() instead of hanging or throwing when authenticate rejects with an unexpected error', async () => {
    const { prisma } = await import('../../../infrastructure/db/prisma');
    vi.mocked(prisma.apiKey.findUnique).mockRejectedValueOnce(new Error('connection reset'));
    const req: any = { headers: { authorization: 'Bearer ' + KEY } };
    const next = vi.fn();

    await identifyApiKey(req, {} as any, next);

    expect(req.apiKey).toBeUndefined();
    expect(next).toHaveBeenCalledTimes(1);
  });
});
