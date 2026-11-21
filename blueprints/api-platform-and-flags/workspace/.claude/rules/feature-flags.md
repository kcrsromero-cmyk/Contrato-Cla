---
description: Feature flag (kill switch) conventions
paths:
  - "backend/src/modules/platform/**"
  - "backend/src/modules/notifications/presentation/routes.ts"
  - "backend/src/modules/analytics/presentation/routes.ts"
---

# Feature flags

- Table `feature_flags` (`key` PK, `enabled` default true). Keys live in `FEATURE_FLAGS` (`platform/domain/featureFlags.ts`): `NOTIFICATIONS`, `ANALYTICS`, `API_ACCESS`.
- Default-open: a missing row is enabled; only `enabled = false` disables. `checkFeatureEnabled` also treats a failed lookup as enabled and logs `Feature flag lookup failed, treating as enabled` at warn.
- Disabled response: 503 `{ ...FEATURE_DISABLED_RESPONSE }` = `{ error: 'Esta funcionalidad está deshabilitada temporalmente. Intenta de nuevo más tarde.', code: 'FEATURE_DISABLED' }`.
- Placement: after the auth chain and limiter, before validation (`notifications`); after `requireAnalytics` (`analytics`); first thing inside `ApiKeyAuthMiddleware` (`API_ACCESS`). Insert, never reorder existing middleware.
- No caching: the next request reads the row. No endpoint, UI or code path writes `feature_flags`; only the seed (`update: {}`) and operators' SQL do.
- `application/isFeatureEnabled.ts` takes the client as a parameter (type-only Prisma import); only `presentation/requireFeatureEnabled.ts` imports `prisma` and `logger`.
