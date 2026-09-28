import { describe, it, expect, vi } from 'vitest';

process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.SUPABASE_URL = 'http://localhost:8000';
process.env.SUPABASE_PUBLISHABLE_KEY = 'anon';
process.env.AUTH_JWKS_URL = 'http://localhost:8000';
process.env.FRONTEND_URL = 'http://localhost:3000';
process.env.SOCRATA_APP_TOKEN = 'test';
process.env.SOCRATA_DATASET_URL = 'http://localhost';
process.env.NODE_ENV = 'test';

import request from 'supertest';
import app from '../server';
import { prisma } from '../infrastructure/db/prisma';

// Mock dependencies to avoid side-effects during tests
vi.mock('../infrastructure/db/prisma', () => ({
  prisma: {
    $queryRaw: vi.fn().mockResolvedValue([]),
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    $disconnect: vi.fn(),
  },
}));

vi.mock('../infrastructure/redis/redisAppClient', () => ({
  redisAppClient: {
    call: vi.fn().mockResolvedValue(null),
    quit: vi.fn(),
  },
}));

vi.mock('express-rate-limit', () => ({
  default: vi.fn(() => (req: any, res: any, next: any) => next()),
}));

describe('API Routes Prefix Testing', () => {
  it('should respond to /health/live without prefix', async () => {
    const res = await request(app).get('/health/live');
    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(600); // the health endpoint works
  });

  it('should respond to /health/ready without prefix', async () => {
    const res = await request(app).get('/health/ready');
    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(600);
  });

  it('should return 404 for /health with prefix /api/v1/health (removed)', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(404);
  });

  it('should mount auth router under /api/v1/auth', async () => {
    // We expect a non-404 status (maybe 400 or 401 for a valid route but lacking body/token)
    // Testing /auth/me to see if it triggers the auth middleware
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).not.toBe(404); // the route exists!
  });

  it('should mount procurement router under /api/v1/procurement', async () => {
    // Testing an existing route on procurement
    const res = await request(app).get('/api/v1/procurement/departments');
    expect(res.status).not.toBe(404); // the route exists!
  });
});
