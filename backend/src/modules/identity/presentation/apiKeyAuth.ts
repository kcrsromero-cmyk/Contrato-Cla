import { RequestHandler } from 'express';
import { prisma } from '../../../infrastructure/db/prisma';
import { redisAppClient } from '../../../infrastructure/redis/redisAppClient';
import { FallbackRedisStore } from '../../../infrastructure/security/rateLimitStore';
import { checkFeatureEnabled } from '../../platform/presentation/requireFeatureEnabled';
import { ApiKeyService } from '../application/ApiKeyService';
import { ApiKeyAuthMiddleware } from './ApiKeyAuthMiddleware';
import { createApiKeyRateLimiter } from './apiKeyRateLimiter';
import { createAuthenticateApiKeyOrSession, createAuthenticateOptionally } from './authenticateApiKeyOrSession';

export const apiKeyService = new ApiKeyService(prisma);

const apiKeyAuthMiddleware = new ApiKeyAuthMiddleware(apiKeyService, checkFeatureEnabled);
const apiKeyRateLimiter = createApiKeyRateLimiter(new FallbackRedisStore(redisAppClient, 'rl:apikey:'));

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
