import type { Request } from 'express';
import rateLimit, { type Store, ipKeyGenerator } from 'express-rate-limit';
import type { ApiKeyRequestContext } from '../domain/ApiKey';
import { apiKeyRequestsPerMinute } from './apiKeyRateLimiter';

export interface IdentityAwareLimiterOptions {
  store?: Store;
  anonymousLimit: number;
  authenticatedLimit: number;
  message: string;
}

const apiKeyContext = (req: Request): ApiKeyRequestContext | undefined => (req as any).apiKey;
const userId = (req: Request): string | undefined => (req as any).user?.id;

/**
 * Keys by the caller's own identity when it has one — the API key id (its own plan-rate
 * limit) or the session user id — and only falls back to the request IP for anonymous
 * traffic. Used behind `authenticateOptionally` so an office or carrier NAT sharing one
 * public IP doesn't make every identified caller behind it share one bucket.
 */
export const createIdentityAwareLimiter = ({ store, anonymousLimit, authenticatedLimit, message }: IdentityAwareLimiterOptions) =>
  rateLimit({
    windowMs: 60 * 1000,
    standardHeaders: true,
    legacyHeaders: false,
    store,
    keyGenerator: (req) => {
      const apiKey = apiKeyContext(req);
      if (apiKey) return `apikey:${apiKey.id}`;
      const uid = userId(req);
      if (uid) return `user:${uid}`;
      return ipKeyGenerator(req.ip ?? 'unknown');
    },
    limit: (req) => {
      const apiKey = apiKeyContext(req);
      if (apiKey) return apiKeyRequestsPerMinute(req);
      return userId(req) ? authenticatedLimit : anonymousLimit;
    },
    message: { error: message },
  });
