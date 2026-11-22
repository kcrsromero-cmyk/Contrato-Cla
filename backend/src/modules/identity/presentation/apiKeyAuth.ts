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
/**
 * Purely an observability signal — crossing this logs one warning so ops can decide, from
 * outside this process, whether to block a genuinely malicious IP at the infrastructure layer
 * (Traefik/WAF/fail2ban). NEVER used to deny a request here: the counter is keyed by IP, and
 * several real customers commonly share one office/NAT IP — denying by IP would let one bad
 * actor get every *other* legitimate key holder behind it rejected too. The actual backstop
 * against a flood is apiKeyAuthAttemptLimiter in server.ts (keyed the same way, but a blunt
 * volume cap that never looks at whether a given attempt succeeded).
 */
const AUTH_FAILURE_ALERT_THRESHOLD = 20;

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
      recordAuthFailure(req.ip);
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
 * Fire-and-forget. If Redis is unavailable, this alert signal is lost but authentication
 * itself is entirely unaffected — that's an explicit, accepted degradation, not a silent one.
 */
function recordAuthFailure(ip: string | undefined): void {
  const key = `apikey:auth-failures:${ip ?? 'unknown'}`;
  authFailureCache.increment(key, AUTH_FAILURE_WINDOW_SECONDS)
    .then((count) => {
      if (count === AUTH_FAILURE_ALERT_THRESHOLD) {
        logger.warn('API key authentication failures crossed the alert threshold for one IP', {
          ip,
          failuresInWindow: count,
        });
      }
    })
    .catch((error: unknown) => {
      logger.warn('Could not record an API key auth failure — Redis may be unavailable; the brute-force alert signal is degraded, but authentication is unaffected', {
        error: error instanceof Error ? error.message : String(error),
      });
    });
}

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
