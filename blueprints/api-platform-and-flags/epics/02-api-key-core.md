# Epic 02: BUSINESS plan data and the API-key core

> After this epic the seed creates `USE_API`, the BUSINESS plan and per-plan API limits, and the identity module holds a tested API-key domain (format, hashing, errors), a user mapper with the exact plan rules of `CurrentUserResolver`, an `ApiKeyService` (authenticate, record usage, issue, list, revoke) and `ApiKeyAuthMiddleware`. Nothing is mounted on a route yet.

| | |
|---|---|
| **Epic id** | `02-api-key-core` |
| **Tasks** | `E2-T1` … `E2-T6` (steps 7–12) |
| **Depends on** | `01-flags-and-seed` (`E1-T1` schema, `E1-T2` flag constants, `E1-T4` seed file) |
| **Unlocks** | `03-api-key-http` |
| **Parallel with** | `E2-T2` and `E2-T3` need nothing earlier, but run in `tasks.json` array order |

You do not need any other file to complete this epic. Everything below is repeated here on purpose.

---

## Stack

Express 4 · TypeScript 5.9 (CommonJS, Node16, `strict`) · Prisma 6.4.1 · zod 4 · winston · vitest 4 (no config file).
Package manager: `npm` in `backend/`. Runtime: Node 22. **No npm dependency is added**: key generation and hashing use `node:crypto` (`randomBytes`, `createHash`), like `notifications/domain/TelegramLinkCode.ts` uses `randomInt`. No bcrypt/argon2: a 256-bit random key needs no slow password hash.

All commands run from the **repository root**.

| Task | Command |
|---|---|
| Typecheck | `(cd backend && npx tsc --noEmit)` |
| Typecheck seed | `(cd backend && npx tsc --noEmit --strict --esModuleInterop --skipLibCheck --target ES2022 --module node16 --moduleResolution node16 prisma/seed.ts)` |
| Build | `(cd backend && npm run build)` |
| Test (one file) | `(cd backend && npx vitest run <path from backend/>)` |
| Lint | NOT CONFIGURED — do not add one |
| Local services | none |

**Gate:** `(cd backend && npx tsc --noEmit)` and the task's own vitest file(s) pass before any task is marked done.

## Directory subtree

```
backend/
  prisma/seed.ts                                       # exists — insertions only (E2-T1)
  src/__tests__/seed.test.ts                           # exists — new it blocks (E2-T1)
  src/modules/identity/
    domain/ApiKey.ts                                   # NEW (E2-T2)
    domain/errors.ts                                   # NEW (E2-T2)
    application/ApiKeyUserMapper.ts                    # NEW (E2-T3)
    application/ApiKeyService.ts                       # NEW (E2-T4), extended (E2-T5)
    presentation/ApiKeyAuthMiddleware.ts               # NEW (E2-T6)
    presentation/CurrentUserResolver.ts                # exists, FROZEN — read only, the rules to mirror
    domain/AuthenticatedUser.ts                        # exists, FROZEN — the shape to produce
    __tests__/ApiKey.test.ts                           # NEW (E2-T2)
    __tests__/ApiKeyUserMapper.test.ts                 # NEW (E2-T3)
    __tests__/ApiKeyService.test.ts                    # NEW (E2-T4)
    __tests__/ApiKeyServiceManagement.test.ts          # NEW (E2-T5)
    __tests__/ApiKeyAuthMiddleware.test.ts             # NEW (E2-T6)
```

**Never edit** `AuthController.ts`, `CurrentUserResolver.ts`, `AuthMiddleware.ts`, `AuthenticatedUser.ts`, `requireCapability.ts`, any routes file (epic 03 does that), `server.ts`, `worker.ts`, `docker-compose.yml`, any `.env.example`, `backend/package.json` or the lockfile. Never set `organizationId` (scope fence). If a task seems to need another file, stop and report.

## Data model touched here

| Entity | Fields used | Notes |
|---|---|---|
| `ApiKey` → `api_keys` | `id`, `userId`, `keyHash` (unique, SHA-256 hex), `keyPrefix` (12 chars), `name`, `createdAt`, `lastUsedAt?`, `revokedAt?`; relation `user` | created in `E1-T1` |
| `Plan` | `name`, `maxFavoriteEntities`, `apiRequestsPerMinute`, `capabilities → capability.name` | `apiRequestsPerMinute` from `E1-T1` |
| Seed | `USE_API` capability; `BUSINESS` plan (`maxFavoriteEntities: 25`; `USE_FAVORITES`, `VIEW_SIMILARITY_ANALYSIS`, `USE_ANALYTICS`, `USE_API`); `USE_API` also on `ENTERPRISE`; `apiRequestsPerMinute` BUSINESS 60, ENTERPRISE 600 (illustrative) | `E2-T1` |

## Contracts

**Consumed** — already exists, do not rebuild:

| From | Interface | Guarantee |
|---|---|---|
| `01` | `platform/domain/featureFlags.ts` | `FEATURE_FLAGS.API_ACCESS = 'API_ACCESS'`, `type FeatureFlagKey`, `FEATURE_DISABLED_MESSAGE = 'Esta funcionalidad está deshabilitada temporalmente. Intenta de nuevo más tarde.'`, `FEATURE_DISABLED_RESPONSE = { error: FEATURE_DISABLED_MESSAGE, code: 'FEATURE_DISABLED' }` |
| `01` | Prisma client | `prisma.apiKey`, `Plan.apiRequestsPerMinute` |
| `01` | `backend/src/__tests__/seed.test.ts` | harness with `calls.capabilityUpserts`, `planUpserts`, `planUpdates`, `planCapabilityUpserts`, `featureFlagUpserts`, `departmentUpserts`, `disconnected`, and `isLinked(plan, capability)`; mocked ids are `plan-<NAME>` and `cap-<NAME>` |
| repo | `CurrentUserResolver.resolve` plan rules | `planName = dbUser.plan?.name \|\| 'FREE'`; expired when `planName !== 'FREE' && planExpiresAt && now >= planExpiresAt`; active → plan's `name`, `maxFavoriteEntities`, capability names; otherwise FREE row: `plan = 'FREE'`, `maxFavoriteEntities ?? 0`, capabilities `?? []`; also `planExpiresAt = dbUser.planExpiresAt \|\| null`, `phone`, `telegramUsername`, `notifyEmail`, `notifyTelegram`, `notifySms` from the row |
| repo | `AuthenticatedUser` | `{ id, email, organizationId?, roles, permissions, name?, avatarUrl?, lastLoginAt?, metadata?, plan?, planExpiresAt?, maxFavoriteEntities?, capabilities?, phone?, telegramUsername?, notifyEmail?, notifyTelegram?, notifySms? }` |

**Produced** — epic 03 depends on exactly these:

| Export | Signature |
|---|---|
| `domain/ApiKey.ts` | `API_KEY_PREFIX = 'ck_live_'`, `API_KEY_RANDOM_BYTES = 32`, `API_KEY_DISPLAY_PREFIX_LENGTH = 12`, `API_KEY_PATTERN = /^ck_live_[A-Za-z0-9_-]{43}$/`, `hashApiKey(plaintext): string`, `generateApiKey(): { plaintext, keyPrefix, keyHash }`, `extractBearerToken(header?): string \| null`, `isApiKeyAuthorization(header?): boolean`, `interface ApiKeyRequestContext { id: string; apiRequestsPerMinute: number \| null }` |
| `domain/errors.ts` | `ApiKeyAuthenticationError` (`code 'INVALID_API_KEY'`), `ApiAccessNotAllowedError` (`'API_ACCESS_NOT_IN_PLAN'`), `ApiKeyNotFoundError` (`'API_KEY_NOT_FOUND'`) |
| `application/ApiKeyService.ts` | `new ApiKeyService(prisma: Pick<PrismaClient,'apiKey'\|'plan'>, now?: () => Date)`; `authenticate(key): Promise<{ apiKeyId, user, apiRequestsPerMinute }>`; `recordUsage(id): Promise<void>`; `issue(userId, name): Promise<IssuedApiKey>`; `listForUser(userId): Promise<ApiKeySummary[]>`; `revoke(userId, id): Promise<ApiKeySummary>` |
| `presentation/ApiKeyAuthMiddleware.ts` | `new ApiKeyAuthMiddleware(apiKeys: ApiKeyAuthenticator, isFeatureEnabled: (key: FeatureFlagKey) => Promise<boolean>)`, `.handle` Express middleware |

## Conventions that bite in this area

- **`CurrentUserResolver.ts` is frozen.** The mapper replicates it; the parity test runs both.
- **`application/` never imports `prisma`, `logger`, `config` or Express** — the client is injected, Prisma types are `import type`.
- **Never log a key, its hash, its prefix or the `Authorization` header.** Log `apiKeyId` only.
- **`seed.ts` edits are insertions only.**
- vitest 4: `vi.mock` factories are hoisted; mock paths are relative to the test file; fake `res` is `{ status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() }`; no `.skip`/`.only`.
- **The standard test key** is `'ck_live_' + 'A'.repeat(43)`; the API-key owner id is `00000000-0000-0000-0000-0000000000aa`.

Full project rules: `CLAUDE.md`. Area rules: `.claude/rules/api-keys.md`, `.claude/rules/prisma-new-tables.md`, `.claude/rules/backend-tests.md` — in the repo root, copied from `blueprints/api-platform-and-flags/workspace/` by §10 Bootstrap of `blueprint.md`.

---

## Tasks

Listed in the same order as `tasks.json`. That order is the build order.

### `E2-T1` — Seed BUSINESS plan, USE_API and API rate limits

**Depends on:** `E1-T1`, `E1-T4` · **Priority:** p0 — metadata for scope cuts, not a running order

Edit `backend/prisma/seed.ts` — insertions only:

1. In `capabilities`, directly after the `USE_ANALYTICS` line:
   ```ts
       { name: 'USE_API', description: 'Permite crear claves de API y consumir la API de forma programática' },
   ```
2. In `plansData`, directly after the `PROFESIONAL` line:
   ```ts
       { name: 'BUSINESS', description: 'Plan para negocios con analítica y acceso por API', maxFavoriteEntities: 25 },
   ```
3. Directly after `console.log('Plans seeded.');`:
   ```ts

     // 2b. API rate limits per plan (requests per minute per API key). Illustrative values, adjustable.
     // Only plans that grant USE_API get a value; every other plan keeps NULL.
     const apiRateLimits = [
       { name: 'BUSINESS', apiRequestsPerMinute: 60 },
       { name: 'ENTERPRISE', apiRequestsPerMinute: 600 },
     ];

     for (const limit of apiRateLimits) {
       await prisma.plan.update({
         where: { name: limit.name },
         data: { apiRequestsPerMinute: limit.apiRequestsPerMinute },
       });
     }
     console.log('API rate limits seeded.');
   ```
4. Directly after the `useAnalytics` fetch line:
   `  const useApi = await prisma.capability.findUnique({ where: { name: 'USE_API' } });`
5. Directly after `const profesional = await prisma.plan.findUnique(…);`:
   `  const business = await prisma.plan.findUnique({ where: { name: 'BUSINESS' } });`
6. Directly after the `profesional && useAnalytics` push line:
   ```ts

     if (business && useFavorites) planCapabilities.push({ planId: business.id, capabilityId: useFavorites.id });
     if (business && viewSimilarity) planCapabilities.push({ planId: business.id, capabilityId: viewSimilarity.id });
     if (business && useAnalytics) planCapabilities.push({ planId: business.id, capabilityId: useAnalytics.id });
     if (business && useApi) planCapabilities.push({ planId: business.id, capabilityId: useApi.id });
   ```
7. Directly after the `enterprise && useAnalytics` push line:
   `  if (enterprise && useApi) planCapabilities.push({ planId: enterprise.id, capabilityId: useApi.id });`

`plan.update` is used so the ENTERPRISE row that already exists everywhere gets its limit without editing the existing upsert line.

Edit `backend/src/__tests__/seed.test.ts`, adding `it` blocks:

- a `BUSINESS` upsert exists with `create.maxFavoriteEntities === 25`; `USE_API` is in `capabilityUpserts`.
- the capability ids linked to `plan-BUSINESS`, sorted, equal `['cap-USE_ANALYTICS', 'cap-USE_API', 'cap-USE_FAVORITES', 'cap-VIEW_SIMILARITY_ANALYSIS']`.
- `isLinked(p, 'USE_API')` is true for `BUSINESS` and `ENTERPRISE`, false for `FREE`, `STARTER`, `PROFESIONAL`.
- `calls.planUpdates` mapped to `[where.name, data.apiRequestsPerMinute]` equals `[['BUSINESS', 60], ['ENTERPRISE', 600]]`.

**Files**
- `backend/prisma/seed.ts` — edit: insertions
- `backend/src/__tests__/seed.test.ts` — edit: new `it` blocks

**Acceptance**

Copied from this task's `acceptance` array in `tasks.json` — identical after the emphasis normalization defined in `agents/blueprint-writer.md` *Acceptance strings*.

1. **WHEN** the seed test runs **THE SYSTEM SHALL** upsert a plan `BUSINESS` with `maxFavoriteEntities: 25` and a capability `USE_API`.
2. **WHEN** the seed test runs **THE SYSTEM SHALL** link `BUSINESS` to exactly `USE_FAVORITES`, `VIEW_SIMILARITY_ANALYSIS`, `USE_ANALYTICS` and `USE_API`.
3. **WHEN** the seed test runs **THE SYSTEM SHALL** link `USE_API` to `BUSINESS` and `ENTERPRISE` only, never to `FREE`, `STARTER` or `PROFESIONAL`.
4. **WHEN** the seed test runs **THE SYSTEM SHALL** call `plan.update` setting `apiRequestsPerMinute` to 60 for `BUSINESS` and 600 for `ENTERPRISE`, and for no other plan.
5. **WHEN** `git diff -U0 HEAD -- backend/prisma/seed.ts` runs **THE SYSTEM SHALL** show zero removed lines, and the seed test, the standalone strict typecheck of `prisma/seed.ts` and `(cd backend && npx tsc --noEmit)` SHALL exit 0.

**Verify** — every command, in order, run from the project root. Each one exits 0 when this task is correct.

```bash
(cd backend && npx vitest run src/__tests__/seed.test.ts)
(cd backend && npx tsc --noEmit --strict --esModuleInterop --skipLibCheck --target ES2022 --module node16 --moduleResolution node16 prisma/seed.ts)
git rev-parse --verify -q HEAD >/dev/null && test -z "$(git diff -U0 HEAD -- backend/prisma/seed.ts | grep -E '^-([^-]|$)')"
(cd backend && npx tsc --noEmit)
```

**Checkpoint**

```bash
git add -A && git commit -m "E2-T1: Seed BUSINESS plan, USE_API and API rate limits"
git tag step-07-seed-business-plan
```

Rollback target before this task: `step-06-analytics-flag`.

### `E2-T2` — Add API key format, hashing and typed errors

**Depends on:** nothing · **Priority:** p0 — metadata for scope cuts, not a running order

Create `backend/src/modules/identity/domain/ApiKey.ts`:

```ts
import { createHash, randomBytes } from 'node:crypto';

export const API_KEY_PREFIX = 'ck_live_';
export const API_KEY_RANDOM_BYTES = 32;
export const API_KEY_DISPLAY_PREFIX_LENGTH = 12;
export const API_KEY_PATTERN = /^ck_live_[A-Za-z0-9_-]{43}$/;

export interface GeneratedApiKey {
  plaintext: string;
  keyPrefix: string;
  keyHash: string;
}

/** What ApiKeyAuthMiddleware attaches as `(req as any).apiKey` for the per-key limiter. */
export interface ApiKeyRequestContext {
  id: string;
  apiRequestsPerMinute: number | null;
}

/** One-way SHA-256 (lowercase hex). A 256-bit random key needs no slow password hash. */
export function hashApiKey(plaintext: string): string {
  return createHash('sha256').update(plaintext, 'utf8').digest('hex');
}

export function generateApiKey(): GeneratedApiKey {
  const plaintext = API_KEY_PREFIX + randomBytes(API_KEY_RANDOM_BYTES).toString('base64url');
  return {
    plaintext,
    keyPrefix: plaintext.slice(0, API_KEY_DISPLAY_PREFIX_LENGTH),
    keyHash: hashApiKey(plaintext),
  };
}

/** The token after the exact, case-sensitive `Bearer ` prefix, or null. */
export function extractBearerToken(authorization: string | undefined): string | null {
  if (!authorization || !authorization.startsWith('Bearer ')) return null;
  return authorization.slice('Bearer '.length);
}

/**
 * True only for `Bearer ck_live_…`. A Supabase JWT starts with `eyJ`, so it can never match.
 */
export function isApiKeyAuthorization(authorization: string | undefined): boolean {
  const token = extractBearerToken(authorization);
  return token !== null && token.startsWith(API_KEY_PREFIX);
}
```

Create `backend/src/modules/identity/domain/errors.ts`:

```ts
export class ApiKeyAuthenticationError extends Error {
  readonly name = 'ApiKeyAuthenticationError';
  readonly code = 'INVALID_API_KEY';

  constructor() {
    super('La clave de API es inválida o fue revocada.');
  }
}

export class ApiAccessNotAllowedError extends Error {
  readonly name = 'ApiAccessNotAllowedError';
  readonly code = 'API_ACCESS_NOT_IN_PLAN';

  constructor() {
    super('Tu plan actual no incluye acceso por API.');
  }
}

export class ApiKeyNotFoundError extends Error {
  readonly name = 'ApiKeyNotFoundError';
  readonly code = 'API_KEY_NOT_FOUND';

  constructor() {
    super('Clave de API no encontrada.');
  }
}
```

Create `backend/src/modules/identity/__tests__/ApiKey.test.ts`:

- `generateApiKey()`: `plaintext` matches `API_KEY_PATTERN`, starts with `ck_live_`, has length 51; `keyPrefix === plaintext.slice(0, 12)`; `keyHash` equals `createHash('sha256').update(plaintext).digest('hex')` (import from `node:crypto` in the test) and matches `/^[0-9a-f]{64}$/`.
- two calls give different `plaintext` and different `keyHash`.
- `isApiKeyAuthorization`: `true` for `'Bearer ck_live_abc'`; `false` for `'Bearer eyJhbGciOiJIUzI1NiJ9.e30.sig'`, `undefined`, `'ck_live_abc'`, `'bearer ck_live_abc'`, `'Basic Y2tfbGl2ZV8='`.
- `extractBearerToken('Bearer xyz') === 'xyz'`, `extractBearerToken('Token xyz') === null`.
- each error is `instanceof Error` with the `name` and `code` above and a non-empty `message`.

**Files**
- `backend/src/modules/identity/domain/ApiKey.ts` — new
- `backend/src/modules/identity/domain/errors.ts` — new
- `backend/src/modules/identity/__tests__/ApiKey.test.ts` — new

**Acceptance**

Copied from this task's `acceptance` array in `tasks.json` — identical after the emphasis normalization defined in `agents/blueprint-writer.md` *Acceptance strings*.

1. **WHEN** `generateApiKey()` runs **THE SYSTEM SHALL** return a `plaintext` matching `^ck_live_[A-Za-z0-9_-]{43}$`, a `keyPrefix` equal to its first 12 characters, and a `keyHash` equal to the lowercase hex SHA-256 of the plaintext.
2. **WHEN** `generateApiKey()` runs twice **THE SYSTEM SHALL** return two different plaintexts and two different hashes.
3. **WHEN** `isApiKeyAuthorization` receives `Bearer ck_live_abc` **THE SYSTEM SHALL** return `true`, and for a `Bearer eyJ…` JWT, a missing header, a token without the `Bearer ` prefix, a lowercase `bearer ` prefix or a `Basic` header SHALL return `false`.
4. **WHEN** `ApiKeyAuthenticationError`, `ApiAccessNotAllowedError` and `ApiKeyNotFoundError` are constructed **THE SYSTEM SHALL** expose `code` `INVALID_API_KEY`, `API_ACCESS_NOT_IN_PLAN` and `API_KEY_NOT_FOUND` respectively, each with a `name` equal to its class name.
5. **WHEN** `(cd backend && npm run build)` runs and `node` requires the built `dist/modules/identity/domain/ApiKey.js` **THE SYSTEM SHALL** exit 0.

**Verify** — every command, in order, run from the project root. Each one exits 0 when this task is correct.

```bash
(cd backend && npx vitest run src/modules/identity/__tests__/ApiKey.test.ts)
(cd backend && npx tsc --noEmit)
(cd backend && npm run build)
(cd backend && node -e "require('./dist/modules/identity/domain/ApiKey.js')")
```

**Checkpoint**

```bash
git add -A && git commit -m "E2-T2: Add API key format, hashing and typed errors"
git tag step-08-api-key-domain
```

Rollback target before this task: `step-07-seed-business-plan`.

### `E2-T3` — Map API-key users with CurrentUserResolver parity

**Depends on:** nothing · **Priority:** p0 — metadata for scope cuts, not a running order

Create `backend/src/modules/identity/application/ApiKeyUserMapper.ts`. `CurrentUserResolver.ts` is frozen and is **not** edited; this file replicates its plan rules line for line:

```ts
import { AuthenticatedUser } from '../domain/AuthenticatedUser';
import { Roles } from '../domain/types';

export interface PlanWithCapabilities {
  name: string;
  maxFavoriteEntities: number | null;
  apiRequestsPerMinute: number | null;
  capabilities: { capability: { name: string } }[];
}

export interface UserWithPlan {
  id: string;
  email: string;
  name: string | null;
  roles: string[];
  phone: string | null;
  telegramUsername: string | null;
  notifyEmail: boolean;
  notifyTelegram: boolean;
  notifySms: boolean;
  planExpiresAt: Date | null;
  plan: PlanWithCapabilities | null;
}

export interface ResolvedApiKeyUser {
  user: AuthenticatedUser;
  apiRequestsPerMinute: number | null;
}

/**
 * Builds the AuthenticatedUser for an API-key request with exactly the plan rules
 * CurrentUserResolver.resolve applies to a web session:
 * - a non-FREE plan whose planExpiresAt has passed falls back to FREE;
 * - no plan falls back to FREE;
 * - FREE values come from the FREE row (maxFavoriteEntities ?? 0, capabilities ?? []).
 * Keep in lockstep with CurrentUserResolver: ApiKeyUserMapper.test.ts runs both on the same rows.
 */
export const buildAuthenticatedUserFromDbUser = async (
  dbUser: UserWithPlan,
  loadFreePlan: () => Promise<PlanWithCapabilities | null>,
  now: Date = new Date(),
): Promise<ResolvedApiKeyUser> => {
  const planName = dbUser.plan?.name || 'FREE';
  const isExpired = planName !== 'FREE' && !!dbUser.planExpiresAt && now >= new Date(dbUser.planExpiresAt);

  let plan: string;
  let maxFavoriteEntities: number | null;
  let capabilities: string[];
  let apiRequestsPerMinute: number | null;

  if (dbUser.plan && !isExpired) {
    plan = dbUser.plan.name;
    maxFavoriteEntities = dbUser.plan.maxFavoriteEntities;
    capabilities = dbUser.plan.capabilities.map((pc) => pc.capability.name);
    apiRequestsPerMinute = dbUser.plan.apiRequestsPerMinute;
  } else {
    const freePlan = await loadFreePlan();
    plan = 'FREE';
    maxFavoriteEntities = freePlan?.maxFavoriteEntities ?? 0;
    capabilities = freePlan?.capabilities.map((pc) => pc.capability.name) ?? [];
    apiRequestsPerMinute = freePlan?.apiRequestsPerMinute ?? null;
  }

  const user: AuthenticatedUser = {
    id: dbUser.id,
    email: dbUser.email,
    roles: dbUser.roles as Roles,
    permissions: [],
    name: dbUser.name ?? undefined,
    planExpiresAt: dbUser.planExpiresAt || null,
    plan,
    maxFavoriteEntities,
    capabilities,
    phone: dbUser.phone,
    telegramUsername: dbUser.telegramUsername,
    notifyEmail: dbUser.notifyEmail,
    notifyTelegram: dbUser.notifyTelegram,
    notifySms: dbUser.notifySms,
  };

  return { user, apiRequestsPerMinute };
};
```

`avatarUrl`, `lastLoginAt`, `metadata` exist only in the Supabase payload and stay undefined; `organizationId` stays undefined (scope fence); `permissions` is `[]`. `AuthenticatedUser` is not changed.

Create `backend/src/modules/identity/__tests__/ApiKeyUserMapper.test.ts`:

- `vi.mock('../../../infrastructure/db/prisma', () => ({ prisma: { user: { upsert: vi.fn() }, plan: { findUnique: vi.fn() } } }))` (only to run `CurrentUserResolver` for parity).
- Fixtures: `baseUser` with `id: 'user-1'`, `email: 'u@test.com'`, `name: 'Ana'`, `roles: ['USER']`, `phone: '3001234567'`, `telegramUsername: 'ana'`, `notifyEmail: true`, `notifyTelegram: false`, `notifySms: false`; `businessPlan = { name: 'BUSINESS', maxFavoriteEntities: 25, apiRequestsPerMinute: 60, capabilities: ['USE_FAVORITES', 'USE_API'].map((name) => ({ capability: { name } })) }`; `freePlan = { name: 'FREE', maxFavoriteEntities: 0, apiRequestsPerMinute: null, capabilities: [{ capability: { name: 'USE_FAVORITES' } }] }`. Three states: active (`planExpiresAt` = now + 1 day, `plan: businessPlan`), expired (now − 1 day, `plan: businessPlan`), no plan (`planExpiresAt: null`, `plan: null`).
- Mapper-only: active → `plan 'BUSINESS'`, `maxFavoriteEntities 25`, capabilities `['USE_FAVORITES', 'USE_API']`, `apiRequestsPerMinute 60`, `loadFreePlan` (a `vi.fn`) not called; expired and no-plan → `plan 'FREE'`, `0`, `['USE_FAVORITES']`, `null`; `loadFreePlan` resolving `null` → `plan 'FREE'`, `0`, `[]`, `null`; identity fields → `id 'user-1'`, `email`, `roles ['USER']`, `permissions []`, and `'organizationId' in user` is `false`.
- Parity `it.each` over the three states: `new CurrentUserResolver({ getCurrentUser: vi.fn(async () => ({ id: 'user-1', email: 'u@test.com', roles: ['USER'], permissions: [] })) } as any)`, `prisma.user.upsert` resolving the state's row, `prisma.plan.findUnique` resolving `freePlan`, `await resolver.resolve({ headers: { authorization: 'Bearer t' } } as any, {} as any, vi.fn())`; then the mapper on the same row with `async () => freePlan`. For `plan`, `maxFavoriteEntities`, `capabilities`, `planExpiresAt`, `phone`, `telegramUsername`, `notifyEmail`, `notifyTelegram`, `notifySms`, the picked objects are `toEqual`.

**Files**
- `backend/src/modules/identity/application/ApiKeyUserMapper.ts` — new
- `backend/src/modules/identity/__tests__/ApiKeyUserMapper.test.ts` — new

**Acceptance**

Copied from this task's `acceptance` array in `tasks.json` — identical after the emphasis normalization defined in `agents/blueprint-writer.md` *Acceptance strings*.

1. **WHEN** the mapper receives a user whose non-FREE plan has a future `planExpiresAt` **THE SYSTEM SHALL** take `plan`, `maxFavoriteEntities`, `capabilities` and `apiRequestsPerMinute` from that plan and SHALL NOT call `loadFreePlan`.
2. **WHEN** the user's non-FREE plan has expired, or the user has no plan, **THE SYSTEM SHALL** set `plan: 'FREE'` and take `maxFavoriteEntities`, `capabilities` and `apiRequestsPerMinute` from the FREE plan `loadFreePlan` returns.
3. **WHEN** `loadFreePlan` returns `null` **THE SYSTEM SHALL** set `plan: 'FREE'`, `maxFavoriteEntities: 0`, `capabilities: []` and `apiRequestsPerMinute: null`.
4. **WHEN** `CurrentUserResolver.resolve` and the mapper receive the same database user in each of the active, expired and no-plan states **THE SYSTEM SHALL** produce equal `plan`, `maxFavoriteEntities`, `capabilities`, `planExpiresAt`, `phone`, `telegramUsername`, `notifyEmail`, `notifyTelegram` and `notifySms`.
5. **WHEN** the mapper builds a user **THE SYSTEM SHALL** set `id`, `email` and `roles` from the database row and `permissions: []`, and SHALL NOT set `organizationId`.
6. **WHEN** `(cd backend && npx tsc --noEmit)` and `CurrentUserResolver.test.ts` run **THE SYSTEM SHALL** exit 0, with `CurrentUserResolver.ts` and `AuthenticatedUser.ts` unchanged since the previous step.

**Verify** — every command, in order, run from the project root. Each one exits 0 when this task is correct.

```bash
(cd backend && npx vitest run src/modules/identity/__tests__/ApiKeyUserMapper.test.ts src/modules/identity/__tests__/CurrentUserResolver.test.ts)
git rev-parse --verify -q HEAD >/dev/null && git diff --quiet HEAD -- backend/src/modules/identity/presentation/CurrentUserResolver.ts backend/src/modules/identity/domain/AuthenticatedUser.ts
(cd backend && npx tsc --noEmit)
```

**Checkpoint**

```bash
git add -A && git commit -m "E2-T3: Map API-key users with CurrentUserResolver parity"
git tag step-09-api-key-user-mapper
```

Rollback target before this task: `step-08-api-key-domain`.

### `E2-T4` — Authenticate API keys in ApiKeyService

**Depends on:** `E1-T1`, `E2-T2`, `E2-T3` · **Priority:** p0 — metadata for scope cuts, not a running order

Create `backend/src/modules/identity/application/ApiKeyService.ts`:

```ts
import type { PrismaClient } from '@prisma/client';
import { AuthenticatedUser } from '../domain/AuthenticatedUser';
import { API_KEY_PATTERN, hashApiKey } from '../domain/ApiKey';
import { ApiAccessNotAllowedError, ApiKeyAuthenticationError } from '../domain/errors';
import { buildAuthenticatedUserFromDbUser } from './ApiKeyUserMapper';

export const USE_API_CAPABILITY = 'USE_API';

export type ApiKeyClient = Pick<PrismaClient, 'apiKey' | 'plan'>;

export interface ApiKeyAuthentication {
  apiKeyId: string;
  user: AuthenticatedUser;
  apiRequestsPerMinute: number | null;
}

export class ApiKeyService {
  constructor(
    private readonly prisma: ApiKeyClient,
    private readonly now: () => Date = () => new Date(),
  ) {}

  /**
   * Resolves a presented key to its owner under the same plan rules as a web session.
   * Throws ApiKeyAuthenticationError (malformed, unknown, revoked) or
   * ApiAccessNotAllowedError (owner's resolved plan lacks USE_API).
   */
  async authenticate(plaintextKey: string): Promise<ApiKeyAuthentication> {
    if (!API_KEY_PATTERN.test(plaintextKey)) throw new ApiKeyAuthenticationError();

    const apiKey = await this.prisma.apiKey.findUnique({
      where: { keyHash: hashApiKey(plaintextKey) },
      include: { user: { include: { plan: { include: { capabilities: { include: { capability: true } } } } } } },
    });
    if (!apiKey || apiKey.revokedAt) throw new ApiKeyAuthenticationError();

    const { user, apiRequestsPerMinute } = await buildAuthenticatedUserFromDbUser(
      apiKey.user,
      () => this.prisma.plan.findUnique({
        where: { name: 'FREE' },
        include: { capabilities: { include: { capability: true } } },
      }),
      this.now(),
    );

    if (!user.capabilities?.includes(USE_API_CAPABILITY)) throw new ApiAccessNotAllowedError();

    return { apiKeyId: apiKey.id, user, apiRequestsPerMinute };
  }

  async recordUsage(apiKeyId: string): Promise<void> {
    await this.prisma.apiKey.update({ where: { id: apiKeyId }, data: { lastUsedAt: this.now() } });
  }
}
```

A downgraded or expired plan fails cleanly with `ApiAccessNotAllowedError` (403 in `E2-T6`); keys are never auto-revoked.

Create `backend/src/modules/identity/__tests__/ApiKeyService.test.ts` with a fake client `{ apiKey: { findUnique: vi.fn(), update: vi.fn(async () => ({})) }, plan: { findUnique: vi.fn() } }` (cast `as any`) and `now = () => new Date('2026-12-01T00:00:00.000Z')`. `KEY = 'ck_live_' + 'A'.repeat(43)`. Owner row: the `E2-T3` `baseUser` shape with `id '00000000-0000-0000-0000-0000000000aa'`, plan `BUSINESS` (`apiRequestsPerMinute 60`, capabilities `USE_FAVORITES`, `USE_ANALYTICS`, `USE_API`).

- `authenticate('ck_live_short')` rejects `ApiKeyAuthenticationError`; `apiKey.findUnique` not called.
- `findUnique` → `null` → rejects `ApiKeyAuthenticationError`.
- row with `revokedAt: new Date('2026-11-30T00:00:00.000Z')` → rejects `ApiKeyAuthenticationError`.
- active BUSINESS row (`id 'key-1'`, `revokedAt null`) → resolves `apiKeyId 'key-1'`, `user.id` the owner id, `user.plan 'BUSINESS'`, capabilities containing `USE_API`, `apiRequestsPerMinute 60`; `findUnique` called with `{ where: { keyHash: createHash('sha256').update(KEY).digest('hex') }, include: { user: { include: { plan: { include: { capabilities: { include: { capability: true } } } } } } } }`.
- BUSINESS row with `planExpiresAt: new Date('2026-11-01T00:00:00.000Z')` and `plan.findUnique` resolving a FREE plan without `USE_API` → rejects `ApiAccessNotAllowedError`.
- active `STARTER` row (capabilities `USE_FAVORITES` only) → rejects `ApiAccessNotAllowedError`.
- `recordUsage('key-1')` → `apiKey.update` called with `{ where: { id: 'key-1' }, data: { lastUsedAt: new Date('2026-12-01T00:00:00.000Z') } }`.

**Files**
- `backend/src/modules/identity/application/ApiKeyService.ts` — new
- `backend/src/modules/identity/__tests__/ApiKeyService.test.ts` — new

**Acceptance**

Copied from this task's `acceptance` array in `tasks.json` — identical after the emphasis normalization defined in `agents/blueprint-writer.md` *Acceptance strings*.

1. **WHEN** `authenticate` receives a token that does not match `^ck_live_[A-Za-z0-9_-]{43}$` **THE SYSTEM SHALL** throw `ApiKeyAuthenticationError` without querying `api_keys`.
2. **WHEN** the SHA-256 of a well-formed key matches no row, or the matching row has `revokedAt` set, **THE SYSTEM SHALL** throw `ApiKeyAuthenticationError`.
3. **WHEN** the key belongs to an active `BUSINESS` user **THE SYSTEM SHALL** look it up by `keyHash` with the user, plan and capabilities included, and return `apiKeyId`, a user with `plan: 'BUSINESS'` whose capabilities include `USE_API`, and `apiRequestsPerMinute: 60`.
4. **WHEN** the owner's paid plan has expired and the FREE fallback lacks `USE_API`, or the owner's active plan lacks `USE_API`, **THE SYSTEM SHALL** throw `ApiAccessNotAllowedError`.
5. **WHEN** `recordUsage(id)` runs **THE SYSTEM SHALL** update that key's `lastUsedAt` to the injected clock's time.
6. **WHEN** `(cd backend && npx tsc --noEmit)` runs **THE SYSTEM SHALL** exit 0, proving the Prisma include result satisfies `UserWithPlan`.

**Verify** — every command, in order, run from the project root. Each one exits 0 when this task is correct.

```bash
(cd backend && npx vitest run src/modules/identity/__tests__/ApiKeyService.test.ts)
(cd backend && npx tsc --noEmit)
```

**Checkpoint**

```bash
git add -A && git commit -m "E2-T4: Authenticate API keys in ApiKeyService"
git tag step-10-api-key-authenticate
```

Rollback target before this task: `step-09-api-key-user-mapper`.

### `E2-T5` — Issue, list and revoke API keys in ApiKeyService

**Depends on:** `E2-T4` · **Priority:** p0 — metadata for scope cuts, not a running order

Edit `backend/src/modules/identity/application/ApiKeyService.ts`:

- Change the domain imports to `import { API_KEY_PATTERN, generateApiKey, hashApiKey } from '../domain/ApiKey';` and `import { ApiAccessNotAllowedError, ApiKeyAuthenticationError, ApiKeyNotFoundError } from '../domain/errors';`.
- Add after `ApiKeyAuthentication`:

```ts
export interface ApiKeySummary {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: Date;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
}

export interface IssuedApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: Date;
  key: string;
}

const SUMMARY_SELECT = {
  id: true,
  name: true,
  keyPrefix: true,
  createdAt: true,
  lastUsedAt: true,
  revokedAt: true,
} as const;
```

- Add these methods to the class, after `recordUsage`:

```ts
  /** Returns the plaintext exactly once; only its hash and 12-char prefix are stored. */
  async issue(userId: string, name: string): Promise<IssuedApiKey> {
    const generated = generateApiKey();
    const created = await this.prisma.apiKey.create({
      data: { userId, name, keyHash: generated.keyHash, keyPrefix: generated.keyPrefix },
      select: { id: true, name: true, keyPrefix: true, createdAt: true },
    });
    return { ...created, key: generated.plaintext };
  }

  async listForUser(userId: string): Promise<ApiKeySummary[]> {
    return this.prisma.apiKey.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: SUMMARY_SELECT,
    });
  }

  /** Another user's key id is indistinguishable from a missing one (ApiKeyNotFoundError). */
  async revoke(userId: string, apiKeyId: string): Promise<ApiKeySummary> {
    const existing = await this.prisma.apiKey.findFirst({ where: { id: apiKeyId, userId }, select: SUMMARY_SELECT });
    if (!existing) throw new ApiKeyNotFoundError();
    if (existing.revokedAt) return existing;
    return this.prisma.apiKey.update({
      where: { id: apiKeyId },
      data: { revokedAt: this.now() },
      select: SUMMARY_SELECT,
    });
  }
```

Create `backend/src/modules/identity/__tests__/ApiKeyServiceManagement.test.ts` with a fake client `{ apiKey: { create: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), update: vi.fn() }, plan: { findUnique: vi.fn() } }` and the clock `new Date('2026-12-01T00:00:00.000Z')`:

- `issue('user-1', 'CI')` with `create` implemented as `async ({ data }) => ({ id: 'key-1', name: 'CI', keyPrefix: data.keyPrefix, createdAt: new Date('2026-12-01T00:00:00.000Z') })`: `create`'s `data` keys sorted equal `['keyHash', 'keyPrefix', 'name', 'userId']`; result `key` matches `API_KEY_PATTERN`; `createHash('sha256').update(result.key).digest('hex') === data.keyHash`; `result.keyPrefix === result.key.slice(0, 12)`; result has no `keyHash` property.
- `listForUser('user-1')` → `findMany` called with `{ where: { userId: 'user-1' }, orderBy: { createdAt: 'desc' }, select: { id: true, name: true, keyPrefix: true, createdAt: true, lastUsedAt: true, revokedAt: true } }`.
- `revoke('user-1', 'key-x')` with `findFirst` → `null`: rejects `ApiKeyNotFoundError`, `update` not called, `findFirst` called with `where: { id: 'key-x', userId: 'user-1' }`.
- active key → `update` called with `data: { revokedAt: <the clock date> }` and its result returned.
- already revoked → returns the `findFirst` row, `update` not called.

**Files**
- `backend/src/modules/identity/application/ApiKeyService.ts` — edit
- `backend/src/modules/identity/__tests__/ApiKeyServiceManagement.test.ts` — new

**Acceptance**

Copied from this task's `acceptance` array in `tasks.json` — identical after the emphasis normalization defined in `agents/blueprint-writer.md` *Acceptance strings*.

1. **WHEN** `issue(userId, 'CI')` runs **THE SYSTEM SHALL** call `apiKey.create` with `data` holding exactly `userId`, `name`, `keyHash` and `keyPrefix`, and SHALL return `{ id, name, keyPrefix, createdAt, key }` where `key` matches `^ck_live_[A-Za-z0-9_-]{43}$`, its SHA-256 hex equals the stored `keyHash`, and `keyPrefix` is its first 12 characters.
2. **WHEN** `listForUser(userId)` runs **THE SYSTEM SHALL** query `where: { userId }` ordered by `createdAt` descending, selecting only `id`, `name`, `keyPrefix`, `createdAt`, `lastUsedAt` and `revokedAt`.
3. **WHEN** `revoke(userId, id)` targets a key that does not exist or belongs to another user **THE SYSTEM SHALL** throw `ApiKeyNotFoundError` and SHALL NOT call `apiKey.update`.
4. **WHEN** `revoke` targets the caller's active key **THE SYSTEM SHALL** set `revokedAt` to the injected clock's time and return the updated summary.
5. **WHEN** `revoke` targets the caller's already-revoked key **THE SYSTEM SHALL** return the existing summary and SHALL NOT call `apiKey.update`.
6. **WHEN** `ApiKeyService.test.ts` and `(cd backend && npx tsc --noEmit)` run **THE SYSTEM SHALL** exit 0.

**Verify** — every command, in order, run from the project root. Each one exits 0 when this task is correct.

```bash
(cd backend && npx vitest run src/modules/identity/__tests__/ApiKeyServiceManagement.test.ts src/modules/identity/__tests__/ApiKeyService.test.ts)
(cd backend && npx tsc --noEmit)
```

**Checkpoint**

```bash
git add -A && git commit -m "E2-T5: Issue, list and revoke API keys in ApiKeyService"
git tag step-11-api-key-management
```

Rollback target before this task: `step-10-api-key-authenticate`.

### `E2-T6` — Add ApiKeyAuthMiddleware

**Depends on:** `E1-T2`, `E2-T4` · **Priority:** p0 — metadata for scope cuts, not a running order

Create `backend/src/modules/identity/presentation/ApiKeyAuthMiddleware.ts`:

```ts
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
```

Create `backend/src/modules/identity/__tests__/ApiKeyAuthMiddleware.test.ts`: `vi.mock('../../../infrastructure/logger', () => ({ logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() } }))`; fake `apiKeys = { authenticate: vi.fn(), recordUsage: vi.fn(async () => undefined) }`; fake `isFeatureEnabled = vi.fn(async () => true)`; `req = { headers: { authorization: 'Bearer ' + KEY } }`; fake `res`; `next = vi.fn()`.

- `isFeatureEnabled` → `false`: 503 with `{ error: FEATURE_DISABLED_MESSAGE, code: 'FEATURE_DISABLED' }`, `authenticate` not called, `isFeatureEnabled` called with `'API_ACCESS'`.
- `authenticate` rejects `new ApiKeyAuthenticationError()`: 401 `{ error: 'La clave de API es inválida o fue revocada.', code: 'INVALID_API_KEY' }`, `next` not called.
- rejects `new ApiAccessNotAllowedError()`: 403 `{ error: 'Tu plan actual no incluye acceso por API.', code: 'API_ACCESS_NOT_IN_PLAN' }`.
- resolves `{ apiKeyId: 'key-1', user, apiRequestsPerMinute: 60 }`: `req.user` is that exact object (`toBe`), `req.apiKey` equals `{ id: 'key-1', apiRequestsPerMinute: 60 }`, `next` called once with no argument, `recordUsage` called with `'key-1'`, `authenticate` called with `KEY`.
- same, but `recordUsage` rejects `new Error('db down')`: `next` still called once and `await vi.waitFor(() => expect(logger.warn).toHaveBeenCalledWith('API key usage timestamp update failed', expect.objectContaining({ apiKeyId: 'key-1' })))`.
- `authenticate` rejects `new Error('boom')`: 500 `{ error: 'Internal Server Error' }`.

**Files**
- `backend/src/modules/identity/presentation/ApiKeyAuthMiddleware.ts` — new
- `backend/src/modules/identity/__tests__/ApiKeyAuthMiddleware.test.ts` — new

**Acceptance**

Copied from this task's `acceptance` array in `tasks.json` — identical after the emphasis normalization defined in `agents/blueprint-writer.md` *Acceptance strings*.

1. **WHEN** the `API_ACCESS` flag is disabled **THE SYSTEM SHALL** respond 503 `{ error: 'Esta funcionalidad está deshabilitada temporalmente. Intenta de nuevo más tarde.', code: 'FEATURE_DISABLED' }` before authenticating any key.
2. **WHEN** authentication throws `ApiKeyAuthenticationError` **THE SYSTEM SHALL** respond 401 `{ error: 'La clave de API es inválida o fue revocada.', code: 'INVALID_API_KEY' }` and SHALL NOT call `next`.
3. **WHEN** authentication throws `ApiAccessNotAllowedError` **THE SYSTEM SHALL** respond 403 `{ error: 'Tu plan actual no incluye acceso por API.', code: 'API_ACCESS_NOT_IN_PLAN' }`.
4. **WHEN** authentication succeeds **THE SYSTEM SHALL** set `req.user` to the resolved `AuthenticatedUser`, set `req.apiKey` to `{ id, apiRequestsPerMinute }`, call `next()` once, and call `recordUsage` with the key id.
5. **WHEN** `recordUsage` rejects **THE SYSTEM SHALL** still call `next()` and SHALL log `API key usage timestamp update failed` at warn; WHEN any other error is thrown THE SYSTEM SHALL respond 500 `{ error: 'Internal Server Error' }`.
6. **WHEN** `(cd backend && npx tsc --noEmit)` runs **THE SYSTEM SHALL** exit 0.

**Verify** — every command, in order, run from the project root. Each one exits 0 when this task is correct.

```bash
(cd backend && npx vitest run src/modules/identity/__tests__/ApiKeyAuthMiddleware.test.ts)
(cd backend && npx tsc --noEmit)
```

**Checkpoint**

```bash
git add -A && git commit -m "E2-T6: Add ApiKeyAuthMiddleware"
git tag step-12-api-key-middleware
```

Rollback target before this task: `step-11-api-key-management`.

---

## Epic done when

All six tasks are `done` in `tasks.json`, their six tags exist, and `(cd backend && npx tsc --noEmit)` plus `(cd backend && npx vitest run src/modules/identity/__tests__/ApiKey.test.ts src/modules/identity/__tests__/ApiKeyUserMapper.test.ts src/modules/identity/__tests__/ApiKeyService.test.ts src/modules/identity/__tests__/ApiKeyServiceManagement.test.ts src/modules/identity/__tests__/ApiKeyAuthMiddleware.test.ts)` exit 0.
