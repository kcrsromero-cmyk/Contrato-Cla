import type { Request } from 'express';
import rateLimit, { type Store } from 'express-rate-limit';
import type { ApiKeyRequestContext } from '../domain/ApiKey';

export const API_KEY_RATE_LIMIT_WINDOW_MS = 60 * 1000;
export const API_KEY_FALLBACK_REQUESTS_PER_MINUTE = 10;
export const API_KEY_RATE_LIMIT_MESSAGE = 'Demasiadas solicitudes con esta clave de API. Intenta de nuevo en un minuto.';

const apiKeyContext = (req: Request): ApiKeyRequestContext | undefined => (req as any).apiKey;

/** Counts per API key id, never per IP. */
export const apiKeyRateLimitKey = (req: Request): string => apiKeyContext(req)?.id ?? 'unknown';

/** The owner's plan limit; a missing or non-positive value falls back to 10 — never unlimited. */
export const apiKeyRequestsPerMinute = (req: Request): number => {
  const configured = apiKeyContext(req)?.apiRequestsPerMinute;
  return typeof configured === 'number' && configured > 0 ? configured : API_KEY_FALLBACK_REQUESTS_PER_MINUTE;
};

export const createApiKeyRateLimiter = (store: Store) =>
  rateLimit({
    windowMs: API_KEY_RATE_LIMIT_WINDOW_MS,
    limit: apiKeyRequestsPerMinute,
    standardHeaders: true,
    legacyHeaders: false,
    store,
    keyGenerator: apiKeyRateLimitKey,
    message: { error: API_KEY_RATE_LIMIT_MESSAGE },
  });
