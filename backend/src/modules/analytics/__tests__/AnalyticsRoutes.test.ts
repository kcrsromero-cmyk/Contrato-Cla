import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

const state = vi.hoisted(() => ({
  flags: {} as Record<string, boolean>,
  sessionCapabilities: ['USE_ANALYTICS'] as string[],
  apiKeyRow: null as any,
}));

vi.mock('../../../infrastructure/config/env', () => ({ config: {} }));

vi.mock('../../../infrastructure/security/jwtValidator', () => ({
  jwtValidator: { verify: vi.fn(async () => ({ sub: '00000000-0000-0000-0000-000000000001' })) },
}));

vi.mock('../../../infrastructure/db/prisma', () => ({
  prisma: {
    user: {
      upsert: vi.fn(async () => ({
        id: '00000000-0000-0000-0000-000000000001',
        email: 'analyst@test.com',
        name: null,
        roles: ['USER'],
        phone: null,
        telegramUsername: null,
        notifyEmail: false,
        notifyTelegram: false,
        notifySms: false,
        planId: null,
        planExpiresAt: null,
        plan: {
          name: 'PROFESIONAL',
          maxFavoriteEntities: 10,
          capabilities: state.sessionCapabilities.map((name) => ({ capability: { name } })),
        },
      })),
    },
    plan: { findUnique: vi.fn(async () => null) },
    featureFlag: {
      findUnique: vi.fn(async ({ where }: any) =>
        where.key in state.flags ? { enabled: state.flags[where.key] } : null,
      ),
    },
    apiKey: { findUnique: vi.fn(async () => state.apiKeyRow), update: vi.fn(async () => ({})) },
  },
}));

vi.mock('../../../infrastructure/redis/redisAppClient', () => ({ redisAppClient: {} }));

vi.mock('../../../infrastructure/security/rateLimitStore', () => ({ FallbackRedisStore: class {} }));

vi.mock('express-rate-limit', () => ({
  default: () => (_req: any, _res: any, next: any) => next(),
}));

vi.mock('../../../infrastructure/logger', () => ({ logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() } }));

vi.mock('../../identity/infrastructure/IdentityProviderRegistry', () => ({
  IdentityProviderRegistry: {
    resolve: () => ({
      getUser: async () => ({
        id: '00000000-0000-0000-0000-000000000001',
        email: 'analyst@test.com',
        roles: ['USER'],
        permissions: [],
      }),
    }),
  },
}));

vi.mock('../application/AnalyticsService', () => ({ AnalyticsService: class {} }));

vi.mock('../presentation/AnalyticsController', () => ({
  AnalyticsController: class {
    constructor() {
      return new Proxy(this, {
        get: (_target, prop) => (req: any, res: any) =>
          res.status(200).json({ handler: String(prop), userId: req.user?.id ?? null }),
      });
    }
  },
}));

const ROUTES = [
  '/persons/supplier-doc-types',
  '/persons/900123456',
  '/suppliers/top-by-count',
  '/suppliers/top-by-value',
  '/departments/contracts',
  '/departments/spending',
  '/contracts/by-modality',
  '/contracts/by-type',
  '/contracts/by-status',
  '/entities/top-by-count',
  '/entities/top-by-spending',
  '/contracts/trends',
];

describe('analyticsRouter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.flags = {};
    state.sessionCapabilities = ['USE_ANALYTICS'];
    state.apiKeyRow = null;
  });

  async function buildApp() {
    const { analyticsRouter } = await import('../presentation/routes');
    const app = express();
    app.use(express.json());
    app.use('/api/v1/analytics', analyticsRouter);
    return app;
  }

  it.each(ROUTES)('responds 200 for %s with a session and no flag row', async (route) => {
    const app = await buildApp();

    const res = await request(app).get(`/api/v1/analytics${route}`).set('Authorization', 'Bearer test-token');

    expect(res.status).toBe(200);
    expect(res.body.userId).toBe('00000000-0000-0000-0000-000000000001');
  });

  it('responds 503 with FEATURE_DISABLED when ANALYTICS is disabled', async () => {
    state.flags.ANALYTICS = false;
    const app = await buildApp();

    const res = await request(app)
      .get('/api/v1/analytics/contracts/trends')
      .set('Authorization', 'Bearer test-token');

    expect(res.status).toBe(503);
    expect(res.body.code).toBe('FEATURE_DISABLED');
  });

  it('responds 403 when the session plan lacks USE_ANALYTICS, even while the flag is disabled', async () => {
    state.sessionCapabilities = [];
    state.flags.ANALYTICS = false;
    const app = await buildApp();

    const res = await request(app)
      .get('/api/v1/analytics/contracts/trends')
      .set('Authorization', 'Bearer test-token');

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: 'Forbidden: Requires USE_ANALYTICS capability' });
  });

  it('responds 401 when no Authorization header is sent', async () => {
    const app = await buildApp();

    const res = await request(app).get('/api/v1/analytics/contracts/trends');

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Missing or invalid Authorization header' });
  });

  function activeKeyRow(capabilities: string[]) {
    return {
      id: 'key-1',
      revokedAt: null,
      user: {
        id: '00000000-0000-0000-0000-0000000000aa',
        email: 'erp@test.com',
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
          capabilities: capabilities.map((name) => ({ capability: { name } })),
        },
      },
    };
  }

  it.each(ROUTES)('responds 200 for %s with an active API key granting USE_ANALYTICS and USE_API', async (route) => {
    state.apiKeyRow = activeKeyRow(['USE_ANALYTICS', 'USE_API']);
    const app = await buildApp();

    const res = await request(app)
      .get(`/api/v1/analytics${route}`)
      .set('Authorization', 'Bearer ' + 'ck_live_' + 'A'.repeat(43));

    expect(res.status).toBe(200);
    expect(res.body.userId).toBe('00000000-0000-0000-0000-0000000000aa');
  });

  it('responds 403 Requires USE_ANALYTICS when the key grants USE_API but not USE_ANALYTICS', async () => {
    state.apiKeyRow = activeKeyRow(['USE_API']);
    const app = await buildApp();

    const res = await request(app)
      .get('/api/v1/analytics/contracts/trends')
      .set('Authorization', 'Bearer ' + 'ck_live_' + 'A'.repeat(43));

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: 'Forbidden: Requires USE_ANALYTICS capability' });
  });

  it('responds 403 API_ACCESS_NOT_IN_PLAN when the key grants USE_ANALYTICS but not USE_API', async () => {
    state.apiKeyRow = activeKeyRow(['USE_ANALYTICS']);
    const app = await buildApp();

    const res = await request(app)
      .get('/api/v1/analytics/contracts/trends')
      .set('Authorization', 'Bearer ' + 'ck_live_' + 'A'.repeat(43));

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('API_ACCESS_NOT_IN_PLAN');
  });

  it('responds 503 FEATURE_DISABLED to an authorized API key when ANALYTICS is disabled', async () => {
    state.apiKeyRow = activeKeyRow(['USE_ANALYTICS', 'USE_API']);
    state.flags.ANALYTICS = false;
    const app = await buildApp();

    const res = await request(app)
      .get('/api/v1/analytics/contracts/trends')
      .set('Authorization', 'Bearer ' + 'ck_live_' + 'A'.repeat(43));

    expect(res.status).toBe(503);
    expect(res.body.code).toBe('FEATURE_DISABLED');
  });

  it('responds 503 to the key when API_ACCESS is disabled, while a session request still gets 200', async () => {
    state.apiKeyRow = activeKeyRow(['USE_ANALYTICS', 'USE_API']);
    state.flags.API_ACCESS = false;
    const app = await buildApp();

    const keyRes = await request(app)
      .get('/api/v1/analytics/contracts/trends')
      .set('Authorization', 'Bearer ' + 'ck_live_' + 'A'.repeat(43));
    expect(keyRes.status).toBe(503);
    expect(keyRes.body.code).toBe('FEATURE_DISABLED');

    const sessionRes = await request(app)
      .get('/api/v1/analytics/contracts/trends')
      .set('Authorization', 'Bearer test-token');
    expect(sessionRes.status).toBe(200);
  });
});
