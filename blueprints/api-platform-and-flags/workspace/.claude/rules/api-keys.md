---
description: API key authentication conventions
paths:
  - "backend/src/modules/identity/**/ApiKey*"
  - "backend/src/modules/identity/**/apiKey*"
  - "backend/src/modules/identity/**/authenticateApiKeyOrSession*"
  - "backend/src/modules/identity/domain/errors.ts"
  - "backend/src/modules/procurement/presentation/routes.ts"
  - "backend/src/modules/analytics/presentation/routes.ts"
---

# API keys

- Format: `ck_live_` + `randomBytes(32).toString('base64url')` (43 chars), pattern `^ck_live_[A-Za-z0-9_-]{43}$`. Stored: `key_hash` = lowercase hex SHA-256 of the full key, `key_prefix` = first 12 chars. `node:crypto` only — no bcrypt/argon2.
- Detection: API-key path if and only if the header starts with the exact `Bearer ` and the token starts with `ck_live_` (`isApiKeyAuthorization`). Everything else takes the unchanged session chain. A malformed `ck_live_` token is 401 `INVALID_API_KEY`, never a session fallback.
- `ApiKeyAuthMiddleware.handle` order: `API_ACCESS` flag (503) → `ApiKeyService.authenticate` (401 malformed/unknown/revoked, 403 `API_ACCESS_NOT_IN_PLAN`) → set `req.user` (an unchanged `AuthenticatedUser`) and `req.apiKey = { id, apiRequestsPerMinute }` → fire-and-forget `recordUsage` (warn on failure) → `next()`.
- Plan rules for API-key users live only in `application/ApiKeyUserMapper.ts` and must match `CurrentUserResolver` exactly (expired or missing plan → FREE row). Change one, change both, and keep `ApiKeyUserMapper.test.ts`'s parity cases green. Never edit `CurrentUserResolver.ts` or `AuthenticatedUser.ts`.
- The API-key path never sets `organizationId`, `avatarUrl`, `lastLoginAt` or `metadata`; `permissions` is `[]`.
- Per-key limiter: `createApiKeyRateLimiter(new FallbackRedisStore(redisAppClient, 'rl:apikey:'))`, created once in `apiKeyAuth.ts`, `keyGenerator` = key id, `limit` = `req.apiKey.apiRequestsPerMinute` (fallback 10, never unlimited). Never change an existing IP limiter.
- Routes reachable by key: wrap the router's own session pair, `authenticateApiKeyOrSession([authMiddleware.handle, currentUserResolver.resolve])`. Public routes never gain auth.
- Key management `/api/v1/auth/api-keys`: `requireSessionAuth` first on every route; POST also `requireCapability('USE_API')`; another user's key id → 404 `API_KEY_NOT_FOUND`, never 403.
- HTTP mapping: `ApiKeyAuthenticationError` → 401, `ApiAccessNotAllowedError` → 403, `ApiKeyNotFoundError` → 404, each `{ error, code }`; anything else → 500 `{ error: 'Internal Server Error' }`.
- Never log the `Authorization` header, a key, its hash or its prefix. Log `apiKeyId` and `userId` only. The plaintext leaves the server once: the 201 of `POST /api/v1/auth/api-keys`.
