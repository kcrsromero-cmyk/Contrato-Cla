export const FEATURE_FLAGS = {
  NOTIFICATIONS: 'NOTIFICATIONS',
  ANALYTICS: 'ANALYTICS',
  API_ACCESS: 'API_ACCESS',
} as const;

export type FeatureFlagKey = (typeof FEATURE_FLAGS)[keyof typeof FEATURE_FLAGS];

export const FEATURE_DISABLED_CODE = 'FEATURE_DISABLED';
export const FEATURE_DISABLED_MESSAGE =
  'Esta funcionalidad está deshabilitada temporalmente. Intenta de nuevo más tarde.';

export const FEATURE_DISABLED_RESPONSE = {
  error: FEATURE_DISABLED_MESSAGE,
  code: FEATURE_DISABLED_CODE,
} as const;
