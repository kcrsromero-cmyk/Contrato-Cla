import type { PrismaClient } from '@prisma/client';
import type { FeatureFlagKey } from '../domain/featureFlags';

export type FeatureFlagReader = Pick<PrismaClient, 'featureFlag'>;

/**
 * Default-open kill switch.
 * Rules:
 * - No row for the key = enabled (a flag not yet created never changes behaviour).
 * - A row with enabled = true = enabled.
 * - Only a row with enabled = false disables the feature.
 */
export const isFeatureEnabled = async (client: FeatureFlagReader, key: FeatureFlagKey): Promise<boolean> => {
  const flag = await client.featureFlag.findUnique({ where: { key }, select: { enabled: true } });
  return flag === null || flag.enabled;
};
