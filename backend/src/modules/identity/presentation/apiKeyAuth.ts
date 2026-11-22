import { RequestHandler } from 'express';
import { logger } from '../../../infrastructure/logger';
import { prisma } from '../../../infrastructure/db/prisma';
import { redisAppClient } from '../../../infrastructure/redis/redisAppClient';
import { FallbackRedisStore } from '../../../infrastructure/security/rateLimitStore';
import { checkFeatureEnabled } from '../../platform/presentation/requireFeatureEnabled';
import { FEATURE_FLAGS } from '../../platform/domain/featureFlags';
import { ApiKeyService } from '../application/ApiKeyService';
import { ApiKeyAuthMiddleware } from './ApiKeyAuthMiddleware';
import { createApiKeyRateLimiter } from './apiKeyRateLimiter';
import { createAuthenticateApiKeyOrSession, createAuthenticateOptionally } from './authenticateApiKeyOrSession';
import { ApiKeyRequestContext, extractBearerToken, isApiKeyAuthorization } from '../domain/ApiKey';

export const apiKeyService = new ApiKeyService(prisma);

const apiKeyAuthMiddleware = new ApiKeyAuthMiddleware(apiKeyService, checkFeatureEnabled);
const apiKeyRateLimiter = createApiKeyRateLimiter(new FallbackRedisStore(redisAppClient, 'rl:apikey:'));

/**
 * Mounted once, globally, before the global rate limiter and before any router. Authenticates
 * an `Authorization: Bearer ctr360_…` request exactly once per request — every downstream
 * middleware (the global limiter's `skip`, `ApiKeyAuthMiddleware.handle`, the per-route
 * identity-aware limiters) reads `req.apiKey`/`req.user` instead of re-querying Postgres.
 * Never rejects: a missing or invalid key just leaves `req.apiKey` unset, so public routes stay
 * public and the global limiter falls back to the IP bucket instead of granting a free pass to
 * a fabricated key.
 */
export const identifyApiKey: RequestHandler = async (req, _res, next) => {
  if (!isApiKeyAuthorization(req.headers.authorization)) return next();
  if (!(await checkFeatureEnabled(FEATURE_FLAGS.API_ACCESS))) return next();

  try {
    const token = extractBearerToken(req.headers.authorization) as string;
    const result = await apiKeyService.authenticate(token);
    const apiKey: ApiKeyRequestContext = { id: result.apiKeyId, apiRequestsPerMinute: result.apiRequestsPerMinute };

    (req as any).user = result.user;
    (req as any).apiKey = apiKey;

    apiKeyService.recordUsage(result.apiKeyId).catch((error: unknown) => {
      logger.warn('API key usage timestamp update failed', {
        apiKeyId: result.apiKeyId,
        error: error instanceof Error ? error.message : String(error),
      });
    });
  } catch {
    // Invalid, revoked or plan-ineligible key — a route that requires one rejects it itself.
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
