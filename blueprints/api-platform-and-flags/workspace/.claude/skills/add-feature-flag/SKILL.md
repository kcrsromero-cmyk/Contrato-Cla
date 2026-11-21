---
name: add-feature-flag
description: Add a new operational kill switch (feature flag) to a backend route or middleware using modules/platform. Use when asked to "add a feature flag", "add a kill switch", "make X disableable without a deploy" or "gate this route behind a flag".
---

# Add a feature flag

## When to use

- A route or a whole path (like API-key auth) must be switchable off in production by one SQL `UPDATE`.
- Not for per-plan access: that is a capability (`requireCapability`) seeded in `backend/prisma/seed.ts`.

## Steps

1. Add the key to `FEATURE_FLAGS` in `backend/src/modules/platform/domain/featureFlags.ts` (UPPER_SNAKE_CASE, value equal to the key). `FeatureFlagKey` updates itself.
2. In the router, add `const require<Name>Enabled = requireFeatureEnabled('<KEY>');` (import from `../../platform/presentation/requireFeatureEnabled`) and insert it **after** the auth chain and any limiter, before validation, so unauthenticated callers keep getting 401 and capability failures keep getting 403. Never remove or reorder existing middleware.
3. In a non-route path, call `checkFeatureEnabled('<KEY>')` and answer `{ ...FEATURE_DISABLED_RESPONSE }` with 503 when it is false.
4. Seed the row in `backend/prisma/seed.ts` by adding one entry to the `featureFlags` array (`enabled: true`). The loop already upserts with `update: {}`, so a re-seed never re-enables a disabled flag. Insert lines only.
5. Test with supertest: flag row `{ enabled: false }` → 503 `code: 'FEATURE_DISABLED'`; no row → normal response; no auth → 401. Add the key to the `featureFlagUpserts` assertion in `backend/src/__tests__/seed.test.ts`.

## Verify

```bash
(cd backend && npx vitest run src/modules/platform)          # expect: exit 0
(cd backend && npx vitest run src/__tests__/seed.test.ts)    # expect: exit 0
(cd backend && npx tsc --noEmit)                             # expect: exit 0
```

## Do not

- Add an endpoint or UI that writes `feature_flags`. Flags are database-only by decision.
- Treat a missing row as disabled. Default-open is the contract.
- Cache flag values in memory. The kill switch must take effect on the next request.
