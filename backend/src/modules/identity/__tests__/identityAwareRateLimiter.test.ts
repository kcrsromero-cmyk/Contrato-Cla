import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createIdentityAwareLimiter } from '../presentation/identityAwareRateLimiter';

function buildApp(seed: (req: any) => void, limiter: ReturnType<typeof createIdentityAwareLimiter>) {
  const app = express();
  app.use((req, _res, next) => {
    seed(req);
    next();
  });
  app.use(limiter);
  app.get('/x', (_req, res) => res.status(200).json({ ok: true }));
  return app;
}

describe('createIdentityAwareLimiter', () => {
  it('keys anonymous requests by IP and enforces the anonymous ceiling', async () => {
    const limiter = createIdentityAwareLimiter({ anonymousLimit: 2, authenticatedLimit: 5, message: 'too many' });
    const app = buildApp(() => {}, limiter);

    const first = await request(app).get('/x');
    const second = await request(app).get('/x');
    const third = await request(app).get('/x');

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(third.status).toBe(429);
    expect(third.body).toEqual({ error: 'too many' });
  });

  it('keys session users by their own id, not the IP, at the authenticated ceiling', async () => {
    const limiter = createIdentityAwareLimiter({ anonymousLimit: 1, authenticatedLimit: 2, message: 'too many' });
    const appUserA = buildApp((req) => { req.user = { id: 'user-a' }; }, limiter);
    const appUserB = buildApp((req) => { req.user = { id: 'user-b' }; }, limiter);

    await request(appUserA).get('/x');
    const secondA = await request(appUserA).get('/x');
    const thirdA = await request(appUserA).get('/x');
    const firstB = await request(appUserB).get('/x');

    expect(secondA.status).toBe(200);
    expect(thirdA.status).toBe(429);
    expect(firstB.status).toBe(200);
  });

  it("honors the API key's own plan rate, ignoring the anonymous/authenticated ceilings", async () => {
    const limiter = createIdentityAwareLimiter({ anonymousLimit: 1, authenticatedLimit: 1, message: 'too many' });
    const app = buildApp((req) => {
      req.apiKey = { id: 'key-1', apiRequestsPerMinute: 3 };
    }, limiter);

    const first = await request(app).get('/x');
    const second = await request(app).get('/x');
    const third = await request(app).get('/x');
    const fourth = await request(app).get('/x');

    expect([first, second, third].map((r) => r.status)).toEqual([200, 200, 200]);
    expect(fourth.status).toBe(429);
  });
});
