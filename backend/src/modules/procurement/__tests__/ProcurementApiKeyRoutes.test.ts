import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

const state = vi.hoisted(() => ({
  flags: {} as Record<string, boolean>,
  apiKeyRow: null as any,
}));

vi.mock('../../../infrastructure/config/env', () => ({ config: {} }));

vi.mock('../../../infrastructure/security/jwtValidator', () => ({
  jwtValidator: { verify: vi.fn(async () => ({ sub: '00000000-0000-0000-0000-000000000001' })) },
}));

vi.mock('../../identity/infrastructure/IdentityProviderRegistry', () => ({
  IdentityProviderRegistry: {
    resolve: () => ({
      getUser: async () => ({
        id: '00000000-0000-0000-0000-000000000001',
        email: 'web@test.com',
        roles: ['USER'],
        permissions: [],
      }),
    }),
  },
}));

vi.mock('../../../infrastructure/db/prisma', () => ({
  prisma: {
    user: {
      upsert: vi.fn(async () => ({
        id: '00000000-0000-0000-0000-000000000001',
        email: 'web@test.com',
        name: null,
        roles: ['USER'],
        phone: null,
        telegramUsername: null,
        notifyEmail: false,
        notifyTelegram: false,
        notifySms: false,
        planId: null,
        planExpiresAt: null,
        plan: { name: 'STARTER', maxFavoriteEntities: 3, capabilities: [{ capability: { name: 'USE_FAVORITES' } }] },
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

vi.mock('../infrastructure/SocrataContractProvider', () => ({ SocrataContractProvider: class {} }));
vi.mock('../application/ProcurementService', () => ({ ProcurementService: class {} }));

vi.mock('../presentation/ProcurementController', () => ({
  ProcurementController: class {
    constructor() {
      return new Proxy(this, {
        get: (_target, prop) => (req: any, res: any) =>
          res.status(200).json({ handler: String(prop), userId: req.user?.id ?? null }),
      });
    }
  },
}));

function activeKeyRow() {
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
        capabilities: ['USE_FAVORITES', 'VIEW_SIMILARITY_ANALYSIS', 'USE_ANALYTICS', 'USE_API'].map((name) => ({
          capability: { name },
        })),
      },
    },
  };
}

const PROTECTED: ['get' | 'post' | 'delete', string][] = [
  ['get', '/similarity'],
  ['post', '/favorites'],
  ['get', '/favorites'],
  ['delete', '/favorites'],
  ['post', '/favorite-entities'],
  ['get', '/favorite-entities'],
  ['delete', '/favorite-entities'],
];

const PUBLIC = ['/departments', '/cities', '/entities', '/entities/search', '/years', '/contracts'];

describe('procurementRouter API key acceptance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.flags = {};
    state.apiKeyRow = null;
  });

  async function buildApp() {
    const { procurementRouter } = await import('../presentation/routes');
    const app = express();
    app.use(express.json());
    app.use('/api/v1/procurement', procurementRouter);
    return app;
  }

  it.each(PROTECTED)('%s %s reaches the controller with the key owner id for an active API key', async (method, path) => {
    state.apiKeyRow = activeKeyRow();
    const app = await buildApp();
    const { jwtValidator } = await import('../../../infrastructure/security/jwtValidator');

    const res = await (request(app) as any)[method](`/api/v1/procurement${path}`).set(
      'Authorization',
      'Bearer ' + 'ck_live_' + 'A'.repeat(43),
    );

    expect(res.status).toBe(200);
    expect(res.body.userId).toBe('00000000-0000-0000-0000-0000000000aa');
    expect(jwtValidator.verify).not.toHaveBeenCalled();
  });

  it.each(PROTECTED)('%s %s reaches the controller with the session user for a session token', async (method, path) => {
    const app = await buildApp();

    const res = await (request(app) as any)[method](`/api/v1/procurement${path}`).set(
      'Authorization',
      'Bearer test-token',
    );

    expect(res.status).toBe(200);
    expect(res.body.userId).toBe('00000000-0000-0000-0000-000000000001');
  });

  it('responds 401 INVALID_API_KEY for a revoked key', async () => {
    state.apiKeyRow = { ...activeKeyRow(), revokedAt: new Date() };
    const app = await buildApp();

    const res = await request(app)
      .get('/api/v1/procurement/favorites')
      .set('Authorization', 'Bearer ' + 'ck_live_' + 'A'.repeat(43));

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_API_KEY');
  });

  it('responds 503 FEATURE_DISABLED to a key while a session request still gets 200 when API_ACCESS is disabled', async () => {
    state.flags.API_ACCESS = false;
    state.apiKeyRow = activeKeyRow();
    const app = await buildApp();

    const keyRes = await request(app)
      .get('/api/v1/procurement/favorites')
      .set('Authorization', 'Bearer ' + 'ck_live_' + 'A'.repeat(43));
    expect(keyRes.status).toBe(503);
    expect(keyRes.body.code).toBe('FEATURE_DISABLED');

    const sessionRes = await request(app).get('/api/v1/procurement/favorites').set('Authorization', 'Bearer test-token');
    expect(sessionRes.status).toBe(200);
  });

  it.each(PUBLIC)('responds 200 for public route %s without Authorization', async (path) => {
    const app = await buildApp();

    const res = await request(app).get(`/api/v1/procurement${path}`);

    expect(res.status).toBe(200);
  });

  it('responds 401 for /favorites with no Authorization', async () => {
    const app = await buildApp();

    const res = await request(app).get('/api/v1/procurement/favorites');

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Missing or invalid Authorization header' });
  });
});
