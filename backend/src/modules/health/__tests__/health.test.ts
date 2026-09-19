import { describe, it, expect, vi } from 'vitest';
import { createHealthCheckHandler } from '../presentation/healthController';
import { AuditMiddleware } from '../../audit/presentation/AuditMiddleware';

describe('Health Check Endpoint', () => {
  const createMockRes = () => {
    const res: any = {};
    res.statusCode = 200;
    res.status = vi.fn().mockImplementation((code) => {
      res.statusCode = code;
      return res;
    });
    res.json = vi.fn().mockImplementation((data) => {
      res.body = data;
      return res;
    });
    return res;
  };

  it('should return 200 OK with connected status when DB and Redis succeed', async () => {
    const mockPrisma = {
      $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
    };
    const mockRedis = {
      ping: vi.fn().mockResolvedValue('PONG'),
    };

    const handler = createHealthCheckHandler({
      prismaClient: mockPrisma,
      redisAdapter: mockRedis,
    });

    const req: any = {};
    const res = createMockRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.db).toBe('connected');
    expect(res.body.redis).toBe('connected');
    expect(typeof res.body.timestamp).toBe('string');
    expect(res.body.version).toBeDefined();
  });

  it('should return 503 Degraded when DB check fails', async () => {
    const mockPrisma = {
      $queryRaw: vi.fn().mockRejectedValue(new Error('DB Connection Error')),
    };
    const mockRedis = {
      ping: vi.fn().mockResolvedValue('PONG'),
    };

    const handler = createHealthCheckHandler({
      prismaClient: mockPrisma,
      redisAdapter: mockRedis,
    });

    const req: any = {};
    const res = createMockRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.body.status).toBe('degraded');
    expect(res.body.db).toBe('error');
    expect(res.body.redis).toBe('connected');
  });

  it('should return 503 Degraded when Redis check fails', async () => {
    const mockPrisma = {
      $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
    };
    const mockRedis = {
      ping: vi.fn().mockRejectedValue(new Error('Redis Connection Error')),
    };

    const handler = createHealthCheckHandler({
      prismaClient: mockPrisma,
      redisAdapter: mockRedis,
    });

    const req: any = {};
    const res = createMockRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.body.status).toBe('degraded');
    expect(res.body.db).toBe('connected');
    expect(res.body.redis).toBe('error');
  });

  it('should return 503 Degraded when Redis returns unexpected reply', async () => {
    const mockPrisma = {
      $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
    };
    const mockRedis = {
      ping: vi.fn().mockResolvedValue('FAILED'),
    };

    const handler = createHealthCheckHandler({
      prismaClient: mockPrisma,
      redisAdapter: mockRedis,
    });

    const req: any = {};
    const res = createMockRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.body.status).toBe('degraded');
    expect(res.body.db).toBe('connected');
    expect(res.body.redis).toBe('error');
  });

  it('should return 503 Degraded when DB query times out', async () => {
    const mockPrisma = {
      $queryRaw: vi.fn().mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 500))),
    };
    const mockRedis = {
      ping: vi.fn().mockResolvedValue('PONG'),
    };

    const handler = createHealthCheckHandler({
      prismaClient: mockPrisma,
      redisAdapter: mockRedis,
      timeoutMs: 50,
    });

    const req: any = {};
    const res = createMockRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.body.status).toBe('degraded');
    expect(res.body.db).toBe('error');
    expect(res.body.redis).toBe('connected');
  });

  it('should skip health endpoints in AuditMiddleware', () => {
    const mockAuditService: any = {
      logAction: vi.fn(),
    };
    const auditMiddleware = new AuditMiddleware(mockAuditService);

    const req: any = { originalUrl: '/api/v1/health' };
    const res: any = {
      on: vi.fn(),
    };
    const next = vi.fn();

    auditMiddleware.logApiConsumption(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.on).not.toHaveBeenCalled();
  });
});
