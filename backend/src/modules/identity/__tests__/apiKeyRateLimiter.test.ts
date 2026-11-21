import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { MemoryStore } from 'express-rate-limit';
import {
  API_KEY_RATE_LIMIT_MESSAGE,
  apiKeyRateLimitKey,
  apiKeyRequestsPerMinute,
  createApiKeyRateLimiter,
} from '../presentation/apiKeyRateLimiter';

function buildApp() {
  const app = express();
  app.use((req, _res, next) => {
    (req as any).apiKey = {
      id: req.header('x-test-key-id'),
      apiRequestsPerMinute: req.header('x-test-rpm') ? Number(req.header('x-test-rpm')) : null,
    };
    next();
  });
  app.use(createApiKeyRateLimiter(new MemoryStore()));
  app.get('/', (_req, res) => res.status(200).json({ ok: true }));
  return app;
}

describe('createApiKeyRateLimiter', () => {
  it('answers 200, 200, then 429 for a key limited to 2 requests per minute', async () => {
    const app = buildApp();

    const first = await request(app).get('/').set('x-test-key-id', 'A').set('x-test-rpm', '2');
    const second = await request(app).get('/').set('x-test-key-id', 'A').set('x-test-rpm', '2');
    const third = await request(app).get('/').set('x-test-key-id', 'A').set('x-test-rpm', '2');

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(third.status).toBe(429);
    expect(third.body).toEqual({ error: API_KEY_RATE_LIMIT_MESSAGE });
  });

  it('still answers 200 to a different key after one key is exhausted', async () => {
    const app = buildApp();

    await request(app).get('/').set('x-test-key-id', 'A').set('x-test-rpm', '2');
    await request(app).get('/').set('x-test-key-id', 'A').set('x-test-rpm', '2');
    await request(app).get('/').set('x-test-key-id', 'A').set('x-test-rpm', '2');

    const res = await request(app).get('/').set('x-test-key-id', 'B').set('x-test-rpm', '2');

    expect(res.status).toBe(200);
  });

  it('answers 200 to all three requests for a key limited to 3 per minute', async () => {
    const app = buildApp();

    const results = [];
    for (let i = 0; i < 3; i++) {
      results.push(await request(app).get('/').set('x-test-key-id', 'C').set('x-test-rpm', '3'));
    }

    for (const res of results) expect(res.status).toBe(200);
  });
});

describe('apiKeyRequestsPerMinute', () => {
  it('falls back to 10 for null, 0 or a missing apiKey', () => {
    expect(apiKeyRequestsPerMinute({ apiKey: { id: 'a', apiRequestsPerMinute: null } } as any)).toBe(10);
    expect(apiKeyRequestsPerMinute({ apiKey: { id: 'a', apiRequestsPerMinute: 0 } } as any)).toBe(10);
    expect(apiKeyRequestsPerMinute({} as any)).toBe(10);
  });

  it('returns the configured positive value', () => {
    expect(apiKeyRequestsPerMinute({ apiKey: { id: 'a', apiRequestsPerMinute: 60 } } as any)).toBe(60);
  });
});

describe('apiKeyRateLimitKey', () => {
  it('returns the api key id, or unknown when absent', () => {
    expect(apiKeyRateLimitKey({ apiKey: { id: 'key-1' } } as any)).toBe('key-1');
    expect(apiKeyRateLimitKey({} as any)).toBe('unknown');
  });
});
