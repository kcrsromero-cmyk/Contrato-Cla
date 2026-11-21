import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../../infrastructure/db/prisma';
import { logger } from '../../../infrastructure/logger';
import { isFeatureEnabled } from '../application/isFeatureEnabled';
import { FEATURE_DISABLED_RESPONSE, FeatureFlagKey } from '../domain/featureFlags';

/**
 * Fail-open lookup: if the flag cannot be read, the feature stays on and a warning is logged.
 */
export const checkFeatureEnabled = async (key: FeatureFlagKey): Promise<boolean> => {
  try {
    return await isFeatureEnabled(prisma, key);
  } catch (error) {
    logger.warn('Feature flag lookup failed, treating as enabled', {
      key,
      error: error instanceof Error ? error.message : String(error),
    });
    return true;
  }
};

export const requireFeatureEnabled = (key: FeatureFlagKey) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!(await checkFeatureEnabled(key))) {
      return res.status(503).json({ ...FEATURE_DISABLED_RESPONSE });
    }

    next();
  };
};
