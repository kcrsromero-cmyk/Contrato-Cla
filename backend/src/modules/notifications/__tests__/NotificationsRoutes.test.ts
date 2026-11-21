import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('../../../infrastructure/config/env', () => ({
  config: {
    APPRISE_URL: 'http://apprise.test:8000',
    TELEGRAM_BOT_TOKEN: 'TEST_TOKEN',
    TELEGRAM_BOT_USERNAME: 'ContrataTestBot',
  },
}));

vi.mock('../../../infrastructure/security/jwtValidator', () => ({
  jwtValidator: { verify: vi.fn(async () => ({ sub: '00000000-0000-0000-0000-000000000001' })) },
}));

vi.mock('../../../infrastructure/db/prisma', () => ({
  prisma: {
    user: {
      upsert: vi.fn(async () => ({
        id: '00000000-0000-0000-0000-000000000001',
        email: 'user@test.com',
        plan: null,
      })),
      update: vi.fn(async () => ({})),
      findUnique: vi.fn(async () => ({
        notifyTelegram: true,
        telegramChatId: '123456789',
      })),
    },
    plan: { findUnique: vi.fn(async () => null) },
  },
}));

vi.mock('../../../infrastructure/redis/redisAppClient', () => ({ redisAppClient: {} }));

vi.mock('../../../infrastructure/security/rateLimitStore', () => ({
  FallbackRedisStore: class {},
}));

vi.mock('express-rate-limit', () => ({
  default: () => (_req: any, _res: any, next: any) => next(),
}));

vi.mock('../../identity/infrastructure/IdentityProviderRegistry', () => ({
  IdentityProviderRegistry: {
    resolve: () => ({
      getUser: async () => ({
        id: '00000000-0000-0000-0000-000000000001',
        email: 'user@test.com',
        roles: ['USER'],
        permissions: [],
      }),
    }),
  },
}));

describe('notificationsRouter', () => {
  async function buildApp() {
    const { notificationsRouter } = await import('../presentation/routes');
    const app = express();
    app.use(express.json());
    app.use('/api/v1/notifications', notificationsRouter);
    return app;
  }

  it('responds 401 for link-code with no Authorization header', async () => {
    const app = await buildApp();

    const res = await request(app).post('/api/v1/notifications/telegram/link-code');

    expect(res.status).toBe(401);
  });

  it('responds 401 for test with no Authorization header', async () => {
    const app = await buildApp();

    const res = await request(app).post('/api/v1/notifications/test');

    expect(res.status).toBe(401);
  });

  it('issues a link code with a bot deep link for an authenticated user', async () => {
    const app = await buildApp();

    const res = await request(app)
      .post('/api/v1/notifications/telegram/link-code')
      .set('Authorization', 'Bearer test-token');

    expect(res.status).toBe(200);
    expect(res.body.code).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
    expect(res.body.botDeepLink).toBe(`https://t.me/ContrataTestBot?start=${res.body.code}`);
  });

  it('responds 400 for test with an unexpected body field', async () => {
    const app = await buildApp();

    const res = await request(app)
      .post('/api/v1/notifications/test')
      .set('Authorization', 'Bearer test-token')
      .send({ extra: 1 });

    expect(res.status).toBe(400);
  });
});
