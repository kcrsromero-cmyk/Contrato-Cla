import { Request, Response, NextFunction } from 'express';
import { logger } from '../../../infrastructure/logger';
import { FEATURE_DISABLED_RESPONSE, FEATURE_FLAGS, FeatureFlagKey } from '../../platform/domain/featureFlags';
import { ApiKeyRequestContext, extractBearerToken } from '../domain/ApiKey';
import { ApiAccessNotAllowedError, ApiKeyAuthenticationError } from '../domain/errors';
import type { ApiKeyAuthentication } from '../application/ApiKeyService';

export interface ApiKeyAuthenticator {
  authenticate(plaintextKey: string): Promise<ApiKeyAuthentication>;
  recordUsage(apiKeyId: string): Promise<void>;
}

export class ApiKeyAuthMiddleware {
  constructor(
    private readonly apiKeys: ApiKeyAuthenticator,
    private readonly isFeatureEnabled: (key: FeatureFlagKey) => Promise<boolean>,
  ) {}

  /**
   * Express middleware for `Authorization: Bearer ck_live_…` requests. Attaches the same
   * AuthenticatedUser shape CurrentUserResolver builds, plus `req.apiKey` for the per-key limiter.
   */
  handle = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!(await this.isFeatureEnabled(FEATURE_FLAGS.API_ACCESS))) {
        return res.status(503).json({ ...FEATURE_DISABLED_RESPONSE });
      }

      const token = extractBearerToken(req.headers.authorization) ?? '';
      const result = await this.apiKeys.authenticate(token);
      const apiKey: ApiKeyRequestContext = { id: result.apiKeyId, apiRequestsPerMinute: result.apiRequestsPerMinute };

      (req as any).user = result.user;
      (req as any).apiKey = apiKey;

      this.apiKeys.recordUsage(result.apiKeyId).catch((error: unknown) => {
        logger.warn('API key usage timestamp update failed', {
          apiKeyId: result.apiKeyId,
          error: error instanceof Error ? error.message : String(error),
        });
      });

      next();
    } catch (error) {
      if (error instanceof ApiKeyAuthenticationError) {
        return res.status(401).json({ error: error.message, code: error.code });
      }
      if (error instanceof ApiAccessNotAllowedError) {
        return res.status(403).json({ error: error.message, code: error.code });
      }
      logger.error('API key authentication error', { error: error instanceof Error ? error.message : String(error) });
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  };
}
