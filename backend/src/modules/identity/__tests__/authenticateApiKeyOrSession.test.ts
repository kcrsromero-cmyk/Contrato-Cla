import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import {
  createAuthenticateApiKeyOrSession,
  requireSessionAuth,
  runHandlers,
  SESSION_REQUIRED_RESPONSE,
} from '../presentation/authenticateApiKeyOrSession';

const KEY = 'ck_live_' + 'A'.repeat(43);

vi.mock('../../../infrastructure/db/prisma', () => ({
  prisma: {
    featureFlag: { findUnique: vi.fn(async () => ({ enabled: false })) },
    apiKey: { findUnique: vi.fn(), update: vi.fn() },
    plan: { findUnique: vi.fn() },
  },
}));
vi.mock('../../../infrastructure/redis/redisAppClient', () => ({ redisAppClient: {} }));
vi.mock('../../../infrastructure/security/rateLimitStore', () => ({ FallbackRedisStore: class {} }));
vi.mock('express-rate-limit', () => ({
  default: () => (_req: any, _res: any, next: any) => next(),
}));
vi.mock('../../../infrastructure/logger', () => ({ logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() } }));

import { prisma } from '../../../infrastructure/db/prisma';

function buildApp(handler: express.RequestHandler) {
  const app = express();
  app.use(express.json());
  app.use(handler);
  app.get('/x', (_req, res) => res.status(200).json({ reached: true }));
  app.use((err: any, _req: any, res: any, _next: any) => res.status(500).json({ error: 'boom' }));
  return app;
}

describe('runHandlers via createAuthenticateApiKeyOrSession', () => {
  let order: string[];

  beforeEach(() => {
    order = [];
  });

  function spy(label: string): express.RequestHandler {
    return (_req, _res, next) => {
      order.push(label);
      next();
    };
  }

  it('runs the API-key handlers in order for an Authorization: Bearer ck_live_… request', async () => {
    const handler = createAuthenticateApiKeyOrSession({
      apiKeyHandlers: [spy('api-1'), spy('api-2')],
      sessionHandlers: [spy('session-1'), spy('session-2')],
    });
    const app = buildApp(handler);

    const res = await request(app).get('/x').set('Authorization', 'Bearer ' + KEY);

    expect(order).toEqual(['api-1', 'api-2']);
    expect(res.status).toBe(200);
  });

  it('runs the session handlers for a JWT', async () => {
    const handler = createAuthenticateApiKeyOrSession({
      apiKeyHandlers: [spy('api-1'), spy('api-2')],
      sessionHandlers: [spy('session-1'), spy('session-2')],
    });
    const app = buildApp(handler);

    await request(app).get('/x').set('Authorization', 'Bearer eyJhbGciOiJIUzI1NiJ9.e30.sig');

    expect(order).toEqual(['session-1', 'session-2']);
  });

  it('runs the session handlers when no Authorization header is sent', async () => {
    const handler = createAuthenticateApiKeyOrSession({
      apiKeyHandlers: [spy('api-1'), spy('api-2')],
      sessionHandlers: [spy('session-1'), spy('session-2')],
    });
    const app = buildApp(handler);

    await request(app).get('/x');

    expect(order).toEqual(['session-1', 'session-2']);
  });

  it('stops the chain when a handler responds without calling next', async () => {
    const respond: express.RequestHandler = (_req, res) => {
      order.push('api-1');
      res.status(401).json({ error: 'nope' });
    };
    const handler = createAuthenticateApiKeyOrSession({
      apiKeyHandlers: [respond, spy('api-2')],
      sessionHandlers: [spy('session-1')],
    });
    const app = buildApp(handler);

    const res = await request(app).get('/x').set('Authorization', 'Bearer ' + KEY);

    expect(res.status).toBe(401);
    expect(order).toEqual(['api-1']);
  });

  it('passes a rejected async handler error to the Express error handler', async () => {
    const rejecting: express.RequestHandler = async () => {
      throw new Error('boom');
    };
    const handler = createAuthenticateApiKeyOrSession({
      apiKeyHandlers: [rejecting],
      sessionHandlers: [spy('session-1')],
    });
    const app = buildApp(handler);

    const res = await request(app).get('/x').set('Authorization', 'Bearer ' + KEY);

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'boom' });
  });
});

describe('requireSessionAuth', () => {
  it('responds 403 SESSION_REQUIRED for an API key', async () => {
    const app = buildApp(requireSessionAuth);

    const res = await request(app).get('/x').set('Authorization', 'Bearer ' + KEY);

    expect(res.status).toBe(403);
    expect(res.body).toEqual(SESSION_REQUIRED_RESPONSE);
  });

  it('calls next and reaches the route for a JWT', async () => {
    const app = buildApp(requireSessionAuth);

    const res = await request(app).get('/x').set('Authorization', 'Bearer eyJhbGciOiJIUzI1NiJ9.e30.sig');

    expect(res.status).toBe(200);
  });
});

describe('wired authenticateApiKeyOrSession', () => {
  it('responds 503 FEATURE_DISABLED for an API key without looking it up or running session handlers', async () => {
    const { authenticateApiKeyOrSession } = await import('../presentation/apiKeyAuth');
    const sessionSpy = vi.fn((_req: any, _res: any, next: any) => next());
    const handler = authenticateApiKeyOrSession([sessionSpy]);
    const app = buildApp(handler);

    const res = await request(app).get('/x').set('Authorization', 'Bearer ' + KEY);

    expect(res.status).toBe(503);
    expect(res.body.code).toBe('FEATURE_DISABLED');
    expect(prisma.apiKey.findUnique).not.toHaveBeenCalled();
    expect(sessionSpy).not.toHaveBeenCalled();
  });
});
