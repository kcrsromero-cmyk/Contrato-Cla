import { Request, Response } from 'express';
import { prisma as defaultPrisma } from '../../../infrastructure/db/prisma';
import { RedisCacheAdapter } from '../../../infrastructure/redis/RedisCacheAdapter';

let defaultRedisAdapter: RedisCacheAdapter | null = null;

function getRedisAdapter(): RedisCacheAdapter {
  if (!defaultRedisAdapter) {
    defaultRedisAdapter = new RedisCacheAdapter();
  }
  return defaultRedisAdapter;
}

export interface HealthCheckOptions {
  prismaClient?: any;
  redisAdapter?: any;
  timeoutMs?: number;
}

export function createHealthCheckHandler(options: HealthCheckOptions = {}) {
  return async (_req: Request, res: Response) => {
    const prismaClient = options.prismaClient || defaultPrisma;
    const redisAdapter = options.redisAdapter || getRedisAdapter();
    const timeoutMs = options.timeoutMs ?? 400;

    const checkDb = async (): Promise<'connected' | 'error'> => {
      try {
        const dbPromise = prismaClient.$queryRaw`SELECT 1`.then(() => 'connected' as const);
        const timeoutPromise = new Promise<'error'>((resolve) =>
          setTimeout(() => resolve('error'), timeoutMs)
        );
        return await Promise.race([dbPromise, timeoutPromise]);
      } catch {
        return 'error';
      }
    };

    const checkRedis = async (): Promise<'connected' | 'error'> => {
      try {
        const redisPromise = redisAdapter.ping().then((reply: string) =>
          reply === 'PONG' ? ('connected' as const) : ('error' as const)
        );
        const timeoutPromise = new Promise<'error'>((resolve) =>
          setTimeout(() => resolve('error'), timeoutMs)
        );
        return await Promise.race([redisPromise, timeoutPromise]);
      } catch {
        return 'error';
      }
    };

    const [dbStatus, redisStatus] = await Promise.all([checkDb(), checkRedis()]);

    const isHealthy = dbStatus === 'connected' && redisStatus === 'connected';
    const statusCode = isHealthy ? 200 : 503;

    return res.status(statusCode).json({
      status: isHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      db: dbStatus,
      redis: redisStatus,
    });
  };
}

export const healthCheckHandler = createHealthCheckHandler();
