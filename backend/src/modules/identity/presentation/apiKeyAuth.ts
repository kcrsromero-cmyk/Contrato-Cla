import { RequestHandler } from 'express';
import { logger } from '../../../infrastructure/logger';
import { prisma } from '../../../infrastructure/db/prisma';
import { redisAppClient } from '../../../infrastructure/redis/redisAppClient';
import { FallbackRedisStore } from '../../../infrastructure/security/rateLimitStore';
import { RedisCacheAdapter } from '../../../infrastructure/redis/RedisCacheAdapter';
import { checkFeatureEnabled } from '../../platform/presentation/requireFeatureEnabled';
import { FEATURE_FLAGS } from '../../platform/domain/featureFlags';
import { ApiKeyService } from '../application/ApiKeyService';
import { ApiKeyAuthMiddleware } from './ApiKeyAuthMiddleware';
import { createApiKeyRateLimiter } from './apiKeyRateLimiter';
import { createAuthenticateApiKeyOrSession, createAuthenticateOptionally } from './authenticateApiKeyOrSession';
import { ApiKeyRequestContext, extractBearerToken, isApiKeyAuthorization } from '../domain/ApiKey';
import { ApiAccessNotAllowedError, ApiKeyAuthenticationError } from '../domain/errors';

export const apiKeyService = new ApiKeyService(prisma);

const apiKeyAuthMiddleware = new ApiKeyAuthMiddleware(apiKeyService, checkFeatureEnabled);
const apiKeyRateLimiter = createApiKeyRateLimiter(new FallbackRedisStore(redisAppClient, 'rl:apikey:'));
const authFailureCache = new RedisCacheAdapter();

const AUTH_FAILURE_WINDOW_SECONDS = 60;
// Past this many invalid-key attempts from one IP inside the window, stop querying Postgres
// for that IP entirely until the window rolls over. Never incremented by a successful or
// plan-ineligible authentication, so a legitimate customer's own volume can never trip it.
const MAX_AUTH_FAILURES_PER_IP = 20;

/**
 * Mounted once, globally, before the global rate limiter and before any router. Authenticates
 * an `Authorization: Bearer ctr360_…` request exactly once per request, setting
 * `req.apiKeyAuthStatus` ('valid' | 'invalid' | 'forbidden' | 'unavailable') alongside
 * `req.apiKey`/`req.user` on success — every downstream middleware (the global limiter's
 * `skip`, `ApiKeyAuthMiddleware.handle`, the per-route identity-aware limiters) reads that
 * instead of re-querying Postgres, even for an invalid key.
 * Never rejects and never throws: the whole body is one try/catch, because an uncaught
 * rejection in an async Express 4 middleware never reaches the error handler — it just hangs
 * the request. A missing, invalid or unresolved key leaves `req.apiKey` unset and falls
 * through to `next()`; a route that requires a key rejects it itself, and the global limiter
 * falls back to the IP bucket instead of granting a free pass.
 */
export const identifyApiKey: RequestHandler = async (req, _res, next) => {
  try {
    if (!isApiKeyAuthorization(req.headers.authorization)) return next();
    if (!(await checkFeatureEnabled(FEATURE_FLAGS.API_ACCESS))) return next();

    const failuresKey = `apikey:auth-failures:${req.ip ?? 'unknown'}`;
    const recentFailures = Number((await authFailureCache.get(failuresKey)) ?? 0);
    if (recentFailures >= MAX_AUTH_FAILURES_PER_IP) {
      // This IP has already shown a pattern of invalid keys — deny without touching Postgres.
      (req as any).apiKeyAuthStatus = 'invalid';
      return next();
    }

    const token = extractBearerToken(req.headers.authorization) as string;
    const result = await apiKeyService.authenticate(token);
    const apiKey: ApiKeyRequestContext = { id: result.apiKeyId, apiRequestsPerMinute: result.apiRequestsPerMinute };

    (req as any).user = result.user;
    (req as any).apiKey = apiKey;
    (req as any).apiKeyAuthStatus = 'valid';

    apiKeyService.recordUsage(result.apiKeyId).catch((error: unknown) => {
      logger.warn('API key usage timestamp update failed', {
        apiKeyId: result.apiKeyId,
        error: error instanceof Error ? error.message : String(error),
      });
    });
  } catch (error) {
    if (error instanceof ApiKeyAuthenticationError) {
      (req as any).apiKeyAuthStatus = 'invalid';
      const failuresKey = `apikey:auth-failures:${req.ip ?? 'unknown'}`;
      authFailureCache.increment(failuresKey, AUTH_FAILURE_WINDOW_SECONDS).catch(() => undefined);
    } else if (error instanceof ApiAccessNotAllowedError) {
      // A real key, just not on a plan with USE_API — never counted as a failed attempt.
      (req as any).apiKeyAuthStatus = 'forbidden';
    } else {
      (req as any).apiKeyAuthStatus = 'unavailable';
      logger.error('identifyApiKey failed unexpectedly; continuing without an identity', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  next();
};

/**
 * Drop-in replacement for `authMiddleware.handle, currentUserResolver.resolve` on routes that
 * machine clients may call. Pass the router's existing session handlers, in their existing order.
 */
export const authenticateApiKeyOrSession = (sessionHandlers: RequestHandler[]): RequestHandler =>
  createAuthenticateApiKeyOrSession({
    apiKeyHandlers: [apiKeyAuthMiddleware.handle, apiKeyRateLimiter],
    sessionHandlers,
  });

/**
 * For public read routes machine clients also hit: no `Authorization` header still works
 * (anonymous), but a key or session, if present, must be valid and populates `req.apiKey`/
 * `req.user` so a downstream identity-aware rate limiter can key on it instead of the IP.
 * Never attaches `apiKeyRateLimiter` here — the route's own limiter already reads
 * `req.apiKey.apiRequestsPerMinute` and would otherwise double-limit the same request.
 */
export const authenticateOptionally = (sessionHandlers: RequestHandler[]): RequestHandler =>
  createAuthenticateOptionally({
    apiKeyHandlers: [apiKeyAuthMiddleware.handle],
    sessionHandlers,
  });
