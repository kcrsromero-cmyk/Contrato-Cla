import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { API_KEY_PATTERN } from '../domain/ApiKey';

const state = vi.hoisted(() => ({ capabilities: ['USE_FAVORITES', 'USE_API'] as string[] }));

vi.mock('../../../infrastructure/config/env', () => ({
  config: { SUPABASE_URL: 'http://localhost', SUPABASE_PUBLISHABLE_KEY: 'anon', AUTH_JWKS_URL: 'http://localhost' },
}));

vi.mock('../../../infrastructure/security/jwtValidator', () => ({
  jwtValidator: { verify: vi.fn(async () => ({ sub: '00000000-0000-0000-0000-000000000001' })) },
}));

vi.mock('../infrastructure/SupabaseIdentityProvider', () => ({
  SupabaseIdentityProvider: class {
    async getUser() {
      return { id: '00000000-0000-0000-0000-000000000001', email: 'owner@test.com', roles: ['USER'], permissions: [] };
    }
  },
}));

vi.mock('../../../infrastructure/db/prisma', () => ({
  prisma: {
    user: {
      upsert: vi.fn(async () => ({
        id: '00000000-0000-0000-0000-000000000001',
        email: 'owner@test.com',
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
          name: 'BUSINESS',
          maxFavoriteEntities: 25,
          capabilities: state.capabilities.map((name) => ({ capability: { name } })),
        },
      })),
    },
    plan: { findUnique: vi.fn(async () => null) },
    featureFlag: { findUnique: vi.fn(async () => null) },
    apiKey: {
      count: vi.fn(async () => 0),
      create: vi.fn(async ({ data }: any) => ({
        id: '3f1c2a8e-5b7d-4c9e-9a1b-2d3e4f5a6b7c',
        name: data.name,
        keyPrefix: data.keyPrefix,
        createdAt: new Date('2026-12-01T00:00:00.000Z'),
      })),
      findMany: vi.fn(async () => [
        {
          id: '3f1c2a8e-5b7d-4c9e-9a1b-2d3e4f5a6b7c',
          name: 'ERP',
          keyPrefix: 'ctr360_AbCd',
          createdAt: new Date('2026-12-01T00:00:00.000Z'),
          lastUsedAt: null,
          revokedAt: null,
        },
      ]),
      findFirst: vi.fn(async () => null),
      update: vi.fn(),
      findUnique: vi.fn(),
    },
    auditLog: { create: vi.fn(async () => ({})) },
  },
}));

vi.mock('../../../infrastructure/redis/redisAppClient', () => ({ redisAppClient: {} }));
vi.mock('../../../infrastructure/security/rateLimitStore', () => ({ FallbackRedisStore: class {} }));
vi.mock('express-rate-limit', () => ({
  default: () => (_req: any, _res: any, next: any) => next(),
}));
vi.mock('../../../infrastructure/logger', () => ({ logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() } }));

import { prisma } from '../../../infrastructure/db/prisma';
import { jwtValidator } from '../../../infrastructure/security/jwtValidator';

const SESSION = 'Bearer test-token';
const KEY = 'ctr360_' + 'A'.repeat(43);

describe('authRouter /api-keys', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.capabilities = ['USE_FAVORITES', 'USE_API'];
  });

  async function buildApp() {
    const { authRouter } = await import('../presentation/routes');
    const app = express();
    app.use(express.json());
    app.use('/api/v1/auth', authRouter);
    return app;
  }

  it('creates an API key for a BUSINESS session', async () => {
    const app = await buildApp();

    const res = await request(app)
      .post('/api/v1/auth/api-keys')
      .set('Authorization', SESSION)
      .send({ name: 'Integración ERP' });

    expect(res.status).toBe(201);
    expect(res.body.key).toMatch(API_KEY_PATTERN);
    expect(res.body.keyPrefix).toBe(res.body.key.slice(0, 12));
    expect('keyHash' in res.body).toBe(false);
  });

  it('responds 409 API_KEY_LIMIT_EXCEEDED when the session already has 10 active keys', async () => {
    (prisma.apiKey.count as any).mockResolvedValueOnce(10);
    const app = await buildApp();

    const res = await request(app)
      .post('/api/v1/auth/api-keys')
      .set('Authorization', SESSION)
      .send({ name: 'Integración ERP' });

    expect(res.status).toBe(409);
    expect(res.body).toEqual({
      error: 'Alcanzaste el máximo de 10 claves de API activas. Revoca una existente antes de crear otra.',
      code: 'API_KEY_LIMIT_EXCEEDED',
    });
    expect(prisma.apiKey.create).not.toHaveBeenCalled();
  });

  it('responds 403 SESSION_REQUIRED for an API key and does not verify a JWT or create a key', async () => {
    const app = await buildApp();

    const res = await request(app)
      .post('/api/v1/auth/api-keys')
      .set('Authorization', 'Bearer ' + KEY)
      .send({ name: 'ERP' });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('SESSION_REQUIRED');
    expect(prisma.apiKey.create).not.toHaveBeenCalled();
    expect(jwtValidator.verify).not.toHaveBeenCalled();
  });

  it('responds 403 when the session plan lacks USE_API, and 400 for an empty body', async () => {
    state.capabilities = ['USE_FAVORITES'];
    const app = await buildApp();

    const res = await request(app)
      .post('/api/v1/auth/api-keys')
      .set('Authorization', SESSION)
      .send({ name: 'ERP' });

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: 'Forbidden: Requires USE_API capability' });
    expect(prisma.apiKey.create).not.toHaveBeenCalled();
  });

  it('responds 400 Validation failed for an empty body', async () => {
    const app = await buildApp();

    const res = await request(app).post('/api/v1/auth/api-keys').set('Authorization', SESSION).send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  it('lists API keys without a keyHash in the response', async () => {
    const app = await buildApp();

    const res = await request(app).get('/api/v1/auth/api-keys').set('Authorization', SESSION);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.apiKeys)).toBe(true);
    expect(JSON.stringify(res.body)).not.toContain('keyHash');
  });

  it('responds 404 revoking a key it does not own, 401 without auth, and /me still works', async () => {
    const app = await buildApp();

    const revokeRes = await request(app)
      .delete('/api/v1/auth/api-keys/3f1c2a8e-5b7d-4c9e-9a1b-2d3e4f5a6b7c')
      .set('Authorization', SESSION);
    expect(revokeRes.status).toBe(404);
    expect(revokeRes.body.code).toBe('API_KEY_NOT_FOUND');

    const unauthRes = await request(app).get('/api/v1/auth/api-keys');
    expect(unauthRes.status).toBe(401);

    const meRes = await request(app).get('/api/v1/auth/me').set('Authorization', SESSION);
    expect(meRes.status).toBe(200);
  });
});
