import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

const state = vi.hoisted(() => ({ flags: {} as Record<string, boolean> }));

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
    featureFlag: {
      findUnique: vi.fn(async ({ where }: any) =>
        where.key in state.flags ? { enabled: state.flags[where.key] } : null,
      ),
    },
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

import { prisma } from '../../../infrastructure/db/prisma';

describe('notifications feature flag', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.flags = {};
  });

  async function buildApp() {
    const { notificationsRouter } = await import('../presentation/routes');
    const app = express();
    app.use(express.json());
    app.use('/api/v1/notifications', notificationsRouter);
    return app;
  }

  it('responds 503 for link-code when NOTIFICATIONS is disabled and does not write to users', async () => {
    state.flags.NOTIFICATIONS = false;
    const app = await buildApp();

    const res = await request(app)
      .post('/api/v1/notifications/telegram/link-code')
      .set('Authorization', 'Bearer test-token');

    expect(res.status).toBe(503);
    expect(res.body.code).toBe('FEATURE_DISABLED');
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('responds 503 for test when NOTIFICATIONS is disabled', async () => {
    state.flags.NOTIFICATIONS = false;
    const app = await buildApp();

    const res = await request(app)
      .post('/api/v1/notifications/test')
      .set('Authorization', 'Bearer test-token');

    expect(res.status).toBe(503);
    expect(res.body.code).toBe('FEATURE_DISABLED');
  });

  it('responds 401 when NOTIFICATIONS is disabled but no Authorization header is sent', async () => {
    state.flags.NOTIFICATIONS = false;
    const app = await buildApp();

    const res = await request(app).post('/api/v1/notifications/test');

    expect(res.status).toBe(401);
  });

  it('issues a link code with status 200 when no NOTIFICATIONS row exists', async () => {
    const app = await buildApp();

    const res = await request(app)
      .post('/api/v1/notifications/telegram/link-code')
      .set('Authorization', 'Bearer test-token');

    expect(res.status).toBe(200);
    expect(res.body.code).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
  });
});
