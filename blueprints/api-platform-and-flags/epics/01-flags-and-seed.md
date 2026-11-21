# Epic 01: Feature flags, schema and the USE_ANALYTICS fix

> After this epic the schema carries `feature_flags`, `api_keys` and `plans.api_requests_per_minute`; a tested default-open feature-flag helper exists in `backend/src/modules/platform/`; the seed creates `USE_ANALYTICS` (the bug fix) and the three flag rows; and the notifications and analytics routes are gated behind their flags.

| | |
|---|---|
| **Epic id** | `01-flags-and-seed` |
| **Tasks** | `E1-T1` … `E1-T6` (steps 1–6) |
| **Depends on** | nothing — start here |
| **Unlocks** | `02-api-key-core`, `03-api-key-http` |
| **Parallel with** | `E2-T2` and `E2-T3` have no dependency on this epic, but run in `tasks.json` array order |

You do not need any other file to complete this epic. Everything below is repeated here on purpose.

---

## Stack

Express 4 · TypeScript 5.9 (CommonJS, `module`/`moduleResolution` Node16, `strict`) · Prisma 6.4.1 on Postgres 15 · zod 4 · winston · express-rate-limit 8.7.0 · vitest 4 (no config file) · supertest.
Package manager: `npm` in `backend/`. Runtime: Node 22. Versions live in `backend/package-lock.json` — read it, never guess one. **This change adds no npm dependency and no env var.**

All commands run from the **repository root** (the directory with `docker-compose.yml`, `backend/`, `blueprints/`).

| Task | Command |
|---|---|
| Install | `(cd backend && npm ci)` |
| Prisma client | `(cd backend && npx prisma generate)` — no database needed |
| Typecheck | `(cd backend && npx tsc --noEmit)` |
| Typecheck seed | `(cd backend && npx tsc --noEmit --strict --esModuleInterop --skipLibCheck --target ES2022 --module node16 --moduleResolution node16 prisma/seed.ts)` |
| Lint | NOT CONFIGURED in this repo — there is no lint gate; do not add one |
| Test (one file) | `(cd backend && npx vitest run <path from backend/>)` |
| Local services | none — no task here touches Postgres, Redis or the network |

**Gate:** `(cd backend && npx tsc --noEmit)` and the task's own vitest file(s) pass before any task is marked done.

## Directory subtree

```
backend/
  prisma/
    schema.prisma                                     # exists — edit (E1-T1)
    seed.ts                                           # exists — insertions only (E1-T3, E1-T4)
    migrations/20261121000000_add_api_keys_and_feature_flags/
      migration.sql                                   # NEW, hand-authored (E1-T1)
  src/
    __tests__/seed.test.ts                            # NEW (E1-T3), extended (E1-T4)
    modules/platform/
      domain/featureFlags.ts                          # NEW (E1-T2)
      application/isFeatureEnabled.ts                 # NEW (E1-T2)
      presentation/requireFeatureEnabled.ts           # NEW (E1-T2)
      __tests__/requireFeatureEnabled.test.ts         # NEW (E1-T2)
    modules/notifications/presentation/routes.ts      # exists — insertions (E1-T5)
    modules/notifications/__tests__/NotificationsRoutes.test.ts      # exists — one mock line (E1-T5)
    modules/notifications/__tests__/NotificationsFeatureFlag.test.ts # NEW (E1-T5)
    modules/analytics/presentation/routes.ts          # exists — edit (E1-T6)
    modules/analytics/__tests__/AnalyticsRoutes.test.ts               # NEW (E1-T6)
```

**Never edit** `AuthController.ts`, `CurrentUserResolver.ts`, `AuthMiddleware.ts`, `AuthenticatedUser.ts`, `requireCapability.ts`, `server.ts`, `worker.ts`, `docker-compose.yml`, any `.env.example`, `backend/package.json` or the lockfile. If a task seems to need a file not listed, stop and report.

## Data model touched here

| Entity | Change | Notes |
|---|---|---|
| `FeatureFlag` → `feature_flags` | NEW: `key String @id`, `enabled Boolean @default(true)`, `description String?`, `createdAt`/`created_at`, `updatedAt`/`updated_at` (`@updatedAt`) | missing row = enabled |
| `ApiKey` → `api_keys` | NEW: `id` uuid, `userId`/`user_id` (FK cascade, indexed), `keyHash`/`key_hash` unique, `keyPrefix`/`key_prefix`, `name`, `createdAt`, `lastUsedAt`/`last_used_at`?, `revokedAt`/`revoked_at`? | used from epic 02 |
| `Plan` → `plans` | adds `apiRequestsPerMinute Int? @map("api_requests_per_minute")` | seeded in epic 02 |
| `User` → `users` | adds inverse relation `apiKeys ApiKey[]` only | no column |
| Seed | capability `USE_ANALYTICS` → PROFESIONAL, ENTERPRISE; flags `NOTIFICATIONS`, `ANALYTICS`, `API_ACCESS` | BUSINESS link in epic 02 |

## Contracts

**Consumed** — already exists, do not rebuild:

| From | Interface | Guarantee |
|---|---|---|
| repo | `requireCapability(name)` | 401 `{ error: 'Unauthorized: User not found' }` without `req.user`; 403 ``{ error: `Forbidden: Requires ${capability} capability` }`` |
| repo | `AuthMiddleware.handle` | 401 `{ error: 'Missing or invalid Authorization header' }` when the header is absent or not `Bearer ` |
| repo | `CurrentUserResolver.resolve` | upserts `users`, attaches `req.user` with `plan`, `maxFavoriteEntities`, `capabilities` (FREE fallback on expiry) |
| repo | `prisma` (`infrastructure/db/prisma.ts`), `logger` (`infrastructure/logger.ts`) | singletons |

**Produced** — later epics depend on exactly these:

| Export | Signature | Used by |
|---|---|---|
| `platform/domain/featureFlags.ts` | `FEATURE_FLAGS` (`NOTIFICATIONS`, `ANALYTICS`, `API_ACCESS`), `type FeatureFlagKey`, `FEATURE_DISABLED_CODE`, `FEATURE_DISABLED_MESSAGE`, `FEATURE_DISABLED_RESPONSE` | `02`, `03` |
| `platform/application/isFeatureEnabled.ts` | `isFeatureEnabled(client: Pick<PrismaClient,'featureFlag'>, key): Promise<boolean>` | — |
| `platform/presentation/requireFeatureEnabled.ts` | `checkFeatureEnabled(key): Promise<boolean>` (fail-open), `requireFeatureEnabled(key)` middleware | `03` (`apiKeyAuth.ts`) |
| Prisma client | `prisma.featureFlag`, `prisma.apiKey`, `Plan.apiRequestsPerMinute` | `02`, `03` |
| `backend/src/__tests__/seed.test.ts` | the harness (`calls`, `isLinked`) | `E2-T1` |

## Conventions that bite in this area

- **Migrations are hand-authored**: never run `prisma migrate dev`, `migrate reset`, `db push` or `migrate deploy`.
- **`seed.ts` edits are insertions only** — the gate asserts `git diff -U0 HEAD -- backend/prisma/seed.ts` has no removed line. The seed runs `main()` at import; its test mocks `@prisma/client`.
- **`tsconfig.json` covers only `src/`**, so the seed has its own standalone strict `tsc` command.
- **vitest 4**: `vi.mock` factories are hoisted and may only use `vi.hoisted` state; mock paths are relative to the test file. Router tests use supertest on a fresh `express()` with `express.json()`. No `.skip`/`.only`.
- **Imports are relative and extensionless**, `node:` prefix for built-ins, `import type` for type-only Prisma imports.
- **User-facing strings are Spanish.**

Full project rules: `CLAUDE.md`. Area rules: `.claude/rules/feature-flags.md`, `.claude/rules/prisma-new-tables.md`, `.claude/rules/prisma-migrations.md`, `.claude/rules/backend-tests.md`. They sit in the repo root; §10 Bootstrap of `blueprint.md` copied the new ones there with `rsync -a --ignore-existing blueprints/api-platform-and-flags/workspace/ ./` and swapped in the merged `CLAUDE.md`.

**Controller Proxy mock** (used by E1-T6), answering 200 for any method name:

```ts
vi.mock('../presentation/AnalyticsController', () => ({
  AnalyticsController: class {
    constructor() {
      return new Proxy(this, {
        get: (_target, prop) => (req: any, res: any) =>
          res.status(200).json({ handler: String(prop), userId: req.user?.id ?? null }),
      });
    }
  },
}));
```

---

## Tasks

Listed in the same order as `tasks.json`. That order is the build order — work top to bottom and do not re-rank by priority.

### `E1-T1` — Add FeatureFlag, ApiKey and plan API limit to schema

**Depends on:** nothing · **Priority:** p0 — metadata for scope cuts, not a running order

Edit `backend/prisma/schema.prisma` — three insertions, no existing line changed:

1. In `model User`, directly after `favoriteEntities FavoriteEntity[]`:
   ```prisma
     apiKeys          ApiKey[]
   ```
2. In `model Plan`, directly after the `maxFavoriteEntities` line:
   ```prisma
     apiRequestsPerMinute Int?   @map("api_requests_per_minute")
   ```
3. Append at the end of the file, after `model Entity`, one blank line between:
   ```prisma
   model FeatureFlag {
     key         String   @id
     enabled     Boolean  @default(true)
     description String?
     createdAt   DateTime @default(now()) @map("created_at")
     updatedAt   DateTime @updatedAt @map("updated_at")

     @@map("feature_flags")
   }

   model ApiKey {
     id         String    @id @default(uuid()) @db.Uuid
     userId     String    @map("user_id") @db.Uuid
     keyHash    String    @unique @map("key_hash")
     keyPrefix  String    @map("key_prefix")
     name       String
     createdAt  DateTime  @default(now()) @map("created_at")
     lastUsedAt DateTime? @map("last_used_at")
     revokedAt  DateTime? @map("revoked_at")

     user User @relation(fields: [userId], references: [id], onDelete: Cascade)

     @@index([userId])
     @@map("api_keys")
   }
   ```

Run `mkdir -p backend/prisma/migrations/20261121000000_add_api_keys_and_feature_flags` and write `backend/prisma/migrations/20261121000000_add_api_keys_and_feature_flags/migration.sql` exactly:

```sql
-- Additive only: two new tables and one nullable column on plans. Nothing existing is altered or removed.
CREATE TABLE IF NOT EXISTS "feature_flags" (
    "key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("key")
);

CREATE TABLE IF NOT EXISTS "api_keys" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "key_hash" TEXT NOT NULL,
    "key_prefix" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "api_keys_key_hash_key" ON "api_keys"("key_hash");
CREATE INDEX IF NOT EXISTS "api_keys_user_id_idx" ON "api_keys"("user_id");

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'api_keys_user_id_fkey') THEN
        ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "api_requests_per_minute" INTEGER;
```

Do not apply it anywhere. Then run `(cd backend && npx prisma generate)`.

**Files**
- `backend/prisma/schema.prisma` — edit: three insertions
- `backend/prisma/migrations/20261121000000_add_api_keys_and_feature_flags/migration.sql` — new

**Acceptance**

Copied from this task's `acceptance` array in `tasks.json` — identical after the emphasis normalization defined in `agents/blueprint-writer.md` *Acceptance strings*. Each one is decidable by a command below, on this machine, during the build.

1. **WHEN** `(cd backend && npx prisma generate)` runs **THE SYSTEM SHALL** exit 0 and `backend/node_modules/.prisma/client/index.d.ts` SHALL contain `FeatureFlagDelegate`, `ApiKeyDelegate`, `apiRequestsPerMinute:` and `keyHash:`.
2. **WHEN** `backend/prisma/migrations/20261121000000_add_api_keys_and_feature_flags/migration.sql` is read **THE SYSTEM SHALL** contain `CREATE TABLE IF NOT EXISTS "feature_flags" (`, `CREATE TABLE IF NOT EXISTS "api_keys" (`, the unique index `api_keys_key_hash_key`, the index `api_keys_user_id_idx`, the `api_keys_user_id_fkey` cascade constraint and `ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "api_requests_per_minute" INTEGER;`.
3. **WHEN** that migration file is searched case-insensitively for `DROP`, `ALTER COLUMN` or `SET NOT NULL` **THE SYSTEM SHALL** find no match.
4. **WHEN** the timestamped directories in `backend/prisma/migrations/` are sorted **THE SYSTEM SHALL** list `20261121000000_add_api_keys_and_feature_flags` last.
5. **WHEN** `git diff -U0 HEAD -- backend/prisma/schema.prisma` runs **THE SYSTEM SHALL** show zero removed lines.
6. **WHEN** `(cd backend && npx tsc --noEmit)` and the frozen-interface tests `UpdateProfile.test.ts` and `CurrentUserResolver.test.ts` run **THE SYSTEM SHALL** exit 0.

**Verify** — every command, in order, run from the project root. Each one exits 0 when this task is correct. The last one exiting 0 is what makes the task done.

```bash
(cd backend && npx prisma generate)
grep -q 'FeatureFlagDelegate' backend/node_modules/.prisma/client/index.d.ts
grep -q 'ApiKeyDelegate' backend/node_modules/.prisma/client/index.d.ts
grep -q 'apiRequestsPerMinute:' backend/node_modules/.prisma/client/index.d.ts
grep -q 'keyHash:' backend/node_modules/.prisma/client/index.d.ts
grep -qF 'CREATE TABLE IF NOT EXISTS "feature_flags" (' backend/prisma/migrations/20261121000000_add_api_keys_and_feature_flags/migration.sql
grep -qF 'CREATE TABLE IF NOT EXISTS "api_keys" (' backend/prisma/migrations/20261121000000_add_api_keys_and_feature_flags/migration.sql
grep -qF 'CREATE UNIQUE INDEX IF NOT EXISTS "api_keys_key_hash_key" ON "api_keys"("key_hash");' backend/prisma/migrations/20261121000000_add_api_keys_and_feature_flags/migration.sql
grep -qF 'CREATE INDEX IF NOT EXISTS "api_keys_user_id_idx" ON "api_keys"("user_id");' backend/prisma/migrations/20261121000000_add_api_keys_and_feature_flags/migration.sql
grep -qF 'ADD CONSTRAINT "api_keys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;' backend/prisma/migrations/20261121000000_add_api_keys_and_feature_flags/migration.sql
grep -qF 'ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "api_requests_per_minute" INTEGER;' backend/prisma/migrations/20261121000000_add_api_keys_and_feature_flags/migration.sql
status=0; grep -qiE 'DROP|ALTER COLUMN|SET NOT NULL' backend/prisma/migrations/20261121000000_add_api_keys_and_feature_flags/migration.sql || status=$?; test "$status" -eq 1
test "$(ls backend/prisma/migrations | grep -E '^[0-9]{14}_' | sort | tail -n 1)" = 20261121000000_add_api_keys_and_feature_flags
git rev-parse --verify -q HEAD >/dev/null && test -z "$(git diff -U0 HEAD -- backend/prisma/schema.prisma | grep -E '^-([^-]|$)')"
(cd backend && npx tsc --noEmit)
(cd backend && npx vitest run src/modules/identity/__tests__/UpdateProfile.test.ts src/modules/identity/__tests__/CurrentUserResolver.test.ts)
```

**Checkpoint**

```bash
git add -A && git commit -m "E1-T1: Add FeatureFlag, ApiKey and plan API limit to schema"
git tag step-01-flags-apikeys-schema
```

Run both after the last `Verify` command exits 0. If the next task goes wrong, `git reset --hard step-01-flags-apikeys-schema`. The rollback target before this task is `api-platform-baseline`.

### `E1-T2` — Add platform feature-flag helper and middleware

**Depends on:** `E1-T1` · **Priority:** p0 — metadata for scope cuts, not a running order

Create `backend/src/modules/platform/domain/featureFlags.ts`:

```ts
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
```

Create `backend/src/modules/platform/application/isFeatureEnabled.ts`:

```ts
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
```

Create `backend/src/modules/platform/presentation/requireFeatureEnabled.ts`:

```ts
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
```

Create `backend/src/modules/platform/__tests__/requireFeatureEnabled.test.ts`:

- `vi.mock('../../../infrastructure/db/prisma', () => ({ prisma: { featureFlag: { findUnique: vi.fn() } } }))` and `vi.mock('../../../infrastructure/logger', () => ({ logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() } }))`; `vi.clearAllMocks()` in `beforeEach`.
- `isFeatureEnabled` with a fake client `{ featureFlag: { findUnique: vi.fn(async () => null) } }` returns `true` and was called with `{ where: { key: 'API_ACCESS' }, select: { enabled: true } }`; with `{ enabled: true }` returns `true`; with `{ enabled: false }` returns `false`.
- `requireFeatureEnabled('ANALYTICS')` with the mocked `prisma.featureFlag.findUnique` resolving `{ enabled: false }`: `res.status` called with 503, `res.json` with `{ error: FEATURE_DISABLED_MESSAGE, code: 'FEATURE_DISABLED' }`, `next` not called. Fake `res` is `{ status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() }`.
- resolving `null`: `next` called once, `res.status` not called.
- rejecting `new Error('db down')`: `next` called once, `logger.warn` called with `'Feature flag lookup failed, treating as enabled'` and `expect.objectContaining({ key: 'ANALYTICS' })`.

**Files**
- `backend/src/modules/platform/domain/featureFlags.ts` — new
- `backend/src/modules/platform/application/isFeatureEnabled.ts` — new
- `backend/src/modules/platform/presentation/requireFeatureEnabled.ts` — new
- `backend/src/modules/platform/__tests__/requireFeatureEnabled.test.ts` — new

**Acceptance**

Copied from this task's `acceptance` array in `tasks.json` — identical after the emphasis normalization defined in `agents/blueprint-writer.md` *Acceptance strings*.

1. **WHEN** `isFeatureEnabled` gets no `feature_flags` row for a key **THE SYSTEM SHALL** return `true` (default-open).
2. **WHEN** `isFeatureEnabled` gets a row with `enabled: false` **THE SYSTEM SHALL** return `false`, and for `enabled: true` SHALL return `true`.
3. **WHEN** a request passes `requireFeatureEnabled('ANALYTICS')` while that row has `enabled: false` **THE SYSTEM SHALL** respond 503 `{ error: 'Esta funcionalidad está deshabilitada temporalmente. Intenta de nuevo más tarde.', code: 'FEATURE_DISABLED' }` and SHALL NOT call `next`.
4. **WHEN** the flag row is missing or the lookup throws **THE SYSTEM SHALL** call `next()` exactly once, and on a throw SHALL log `Feature flag lookup failed, treating as enabled` at warn.
5. **WHEN** `(cd backend && npm run build)` runs and `node` requires the built `dist/modules/platform/application/isFeatureEnabled.js` **THE SYSTEM SHALL** exit 0.

**Verify** — every command, in order, run from the project root. Each one exits 0 when this task is correct.

```bash
(cd backend && npx vitest run src/modules/platform/__tests__/requireFeatureEnabled.test.ts)
(cd backend && npx tsc --noEmit)
(cd backend && npm run build)
(cd backend && node -e "require('./dist/modules/platform/application/isFeatureEnabled.js')")
```

**Checkpoint**

```bash
git add -A && git commit -m "E1-T2: Add platform feature-flag helper and middleware"
git tag step-02-feature-flag-helper
```

Rollback target before this task: `step-01-flags-apikeys-schema`.

### `E1-T3` — Seed USE_ANALYTICS capability for paid plans

**Depends on:** nothing · **Priority:** p0 — metadata for scope cuts, not a running order

This is the bug fix: `analytics/presentation/routes.ts` already requires `USE_ANALYTICS`, and nothing ever created it. Do not touch the route file.

Edit `backend/prisma/seed.ts` with **four insertions** and no other change:

1. In the `capabilities` array, directly after the `USE_FAVORITES` line:
   ```ts
       { name: 'USE_ANALYTICS', description: 'Permite acceder a los tableros y consultas de analítica' },
   ```
2. Directly after `const viewSimilarity = await prisma.capability.findUnique(…);`:
   ```ts
     const useAnalytics = await prisma.capability.findUnique({ where: { name: 'USE_ANALYTICS' } });
   ```
3. Directly after the `profesional && viewSimilarity` push line:
   ```ts
     if (profesional && useAnalytics) planCapabilities.push({ planId: profesional.id, capabilityId: useAnalytics.id });
   ```
4. Directly after the `enterprise && viewSimilarity` push line:
   ```ts
     if (enterprise && useAnalytics) planCapabilities.push({ planId: enterprise.id, capabilityId: useAnalytics.id });
   ```

STARTER and FREE get no link. The BUSINESS link is added in `E2-T1`.

Create `backend/src/__tests__/seed.test.ts` with this harness (later tasks add `it` blocks):

```ts
import { describe, it, expect, vi, beforeAll } from 'vitest';

const calls = vi.hoisted(() => ({
  capabilityUpserts: [] as any[],
  planUpserts: [] as any[],
  planUpdates: [] as any[],
  planCapabilityUpserts: [] as any[],
  featureFlagUpserts: [] as any[],
  departmentUpserts: [] as any[],
  disconnected: false,
}));

vi.mock('@prisma/client', () => ({
  PrismaClient: class {
    capability = {
      upsert: async (args: any) => { calls.capabilityUpserts.push(args); return { id: `cap-${args.where.name}` }; },
      findUnique: async (args: any) => ({ id: `cap-${args.where.name}`, name: args.where.name }),
    };
    plan = {
      upsert: async (args: any) => { calls.planUpserts.push(args); return { id: `plan-${args.where.name}` }; },
      update: async (args: any) => { calls.planUpdates.push(args); return { id: `plan-${args.where.name}` }; },
      findUnique: async (args: any) => ({ id: `plan-${args.where.name}`, name: args.where.name }),
    };
    planCapability = { upsert: async (args: any) => { calls.planCapabilityUpserts.push(args); return args.create; } };
    featureFlag = { upsert: async (args: any) => { calls.featureFlagUpserts.push(args); return args.create; } };
    department = { upsert: async (args: any) => { calls.departmentUpserts.push(args); return { id: `dept-${args.where.name}` }; } };
    city = { upsert: async (args: any) => args.create };
    $disconnect = async () => { calls.disconnected = true; };
  },
}));

const isLinked = (plan: string, capability: string) =>
  calls.planCapabilityUpserts.some(
    (a) => a.create.planId === `plan-${plan}` && a.create.capabilityId === `cap-${capability}`,
  );

let exitSpy: any;

beforeAll(async () => {
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
  await import('../../prisma/seed');
  await vi.waitFor(() => expect(calls.disconnected).toBe(true));
});

describe('prisma/seed.ts', () => {
  // it blocks go here
});
```

`it` blocks for this task:

- `USE_ANALYTICS` is in `calls.capabilityUpserts` (by `where.name`) with `update` equal to `{}`.
- `isLinked('PROFESIONAL', 'USE_ANALYTICS')` and `isLinked('ENTERPRISE', 'USE_ANALYTICS')` are true; `isLinked('STARTER', 'USE_ANALYTICS')` and `isLinked('FREE', 'USE_ANALYTICS')` are false.
- Pre-existing links `STARTER`→`USE_FAVORITES`, `PROFESIONAL`→`USE_FAVORITES` and `VIEW_SIMILARITY_ANALYSIS`, `ENTERPRISE`→`USE_FAVORITES` and `VIEW_SIMILARITY_ANALYSIS` are all true.
- `calls.departmentUpserts` contains `where.name` `Amazonas` and `Vichada`, `calls.disconnected` is true and `exitSpy` was not called.

**Files**
- `backend/prisma/seed.ts` — edit: four insertions
- `backend/src/__tests__/seed.test.ts` — new

**Acceptance**

Copied from this task's `acceptance` array in `tasks.json` — identical after the emphasis normalization defined in `agents/blueprint-writer.md` *Acceptance strings*.

1. **WHEN** `backend/src/__tests__/seed.test.ts` runs `backend/prisma/seed.ts` against the mocked `PrismaClient` **THE SYSTEM SHALL** upsert a capability named `USE_ANALYTICS` with `update: {}`.
2. **WHEN** the seed test runs **THE SYSTEM SHALL** link `USE_ANALYTICS` to `PROFESIONAL` and `ENTERPRISE` and SHALL NOT link it to `STARTER` or `FREE`.
3. **WHEN** the seed test runs **THE SYSTEM SHALL** still link `STARTER`→`USE_FAVORITES`, `PROFESIONAL`→`USE_FAVORITES` and `VIEW_SIMILARITY_ANALYSIS`, `ENTERPRISE`→`USE_FAVORITES` and `VIEW_SIMILARITY_ANALYSIS`, upsert the departments `Amazonas` and `Vichada`, call `$disconnect`, and never call `process.exit`.
4. **WHEN** `git diff -U0 HEAD -- backend/prisma/seed.ts` runs **THE SYSTEM SHALL** show zero removed lines.
5. **WHEN** the standalone strict typecheck of `prisma/seed.ts` and `(cd backend && npx tsc --noEmit)` run **THE SYSTEM SHALL** exit 0.

**Verify** — every command, in order, run from the project root. Each one exits 0 when this task is correct.

```bash
(cd backend && npx vitest run src/__tests__/seed.test.ts)
(cd backend && npx tsc --noEmit --strict --esModuleInterop --skipLibCheck --target ES2022 --module node16 --moduleResolution node16 prisma/seed.ts)
git rev-parse --verify -q HEAD >/dev/null && test -z "$(git diff -U0 HEAD -- backend/prisma/seed.ts | grep -E '^-([^-]|$)')"
(cd backend && npx tsc --noEmit)
```

**Checkpoint**

```bash
git add -A && git commit -m "E1-T3: Seed USE_ANALYTICS capability for paid plans"
git tag step-03-seed-use-analytics
```

Rollback target before this task: `step-02-feature-flag-helper`.

### `E1-T4` — Seed the three default-open feature flags

**Depends on:** `E1-T1`, `E1-T3` · **Priority:** p0 — metadata for scope cuts, not a running order

Edit `backend/prisma/seed.ts`: directly after the line `console.log('Plan capabilities linked.');`, insert (no other change):

```ts

  // 3b. Feature flags — operational kill switches, default-open. `update: {}` never
  // re-enables a flag an operator disabled, so re-running the seed is safe.
  const featureFlags = [
    { key: 'NOTIFICATIONS', description: 'Rutas /api/v1/notifications (Telegram)' },
    { key: 'ANALYTICS', description: 'Rutas /api/v1/analytics' },
    { key: 'API_ACCESS', description: 'Autenticación con claves de API (Authorization: Bearer ck_live_)' },
  ];

  for (const flag of featureFlags) {
    await prisma.featureFlag.upsert({
      where: { key: flag.key },
      update: {},
      create: { key: flag.key, enabled: true, description: flag.description },
    });
  }
  console.log('Feature flags seeded.');
```

Edit `backend/src/__tests__/seed.test.ts`: add `it` blocks asserting that `calls.featureFlagUpserts` holds exactly the keys `NOTIFICATIONS`, `ANALYTICS`, `API_ACCESS` (compare sorted `where.key` lists), each with `create.enabled === true` and `update` equal to `{}`.

**Files**
- `backend/prisma/seed.ts` — edit: one inserted block
- `backend/src/__tests__/seed.test.ts` — edit: new `it` blocks

**Acceptance**

Copied from this task's `acceptance` array in `tasks.json` — identical after the emphasis normalization defined in `agents/blueprint-writer.md` *Acceptance strings*.

1. **WHEN** the seed test runs **THE SYSTEM SHALL** upsert feature flags `NOTIFICATIONS`, `ANALYTICS` and `API_ACCESS`, each with `create.enabled` equal to `true`.
2. **WHEN** the seed test runs **THE SYSTEM SHALL** give every feature-flag upsert `update: {}`, so re-seeding never re-enables a flag an operator disabled.
3. **WHEN** `git diff -U0 HEAD -- backend/prisma/seed.ts` runs **THE SYSTEM SHALL** show zero removed lines.
4. **WHEN** the seed test, the standalone strict typecheck of `prisma/seed.ts` and `(cd backend && npx tsc --noEmit)` run **THE SYSTEM SHALL** exit 0, with the step-3 assertions still passing.

**Verify** — every command, in order, run from the project root. Each one exits 0 when this task is correct.

```bash
(cd backend && npx vitest run src/__tests__/seed.test.ts)
(cd backend && npx tsc --noEmit --strict --esModuleInterop --skipLibCheck --target ES2022 --module node16 --moduleResolution node16 prisma/seed.ts)
git rev-parse --verify -q HEAD >/dev/null && test -z "$(git diff -U0 HEAD -- backend/prisma/seed.ts | grep -E '^-([^-]|$)')"
(cd backend && npx tsc --noEmit)
```

**Checkpoint**

```bash
git add -A && git commit -m "E1-T4: Seed the three default-open feature flags"
git tag step-04-seed-feature-flags
```

Rollback target before this task: `step-03-seed-use-analytics`.

### `E1-T5` — Gate notifications routes behind NOTIFICATIONS

**Depends on:** `E1-T2` · **Priority:** p1 — metadata for scope cuts, not a running order

Edit `backend/src/modules/notifications/presentation/routes.ts` — insertions only:

1. After `import { jwtValidator } from '../../../infrastructure/security/jwtValidator';` add `import { requireFeatureEnabled } from '../../platform/presentation/requireFeatureEnabled';`
2. After the closing `});` of the `notificationsLimiter = rateLimit({…})` block add a blank line and `const requireNotificationsEnabled = requireFeatureEnabled('NOTIFICATIONS');`
3. In **both** routes insert the line `  requireNotificationsEnabled,` directly after `  notificationsLimiter,`.

Resulting chain per route: `authMiddleware.handle` → `currentUserResolver.resolve` → `notificationsLimiter` → `requireNotificationsEnabled` → `validateRequest(EmptyBodySchema)` → controller. Nothing removed or reordered.

Edit `backend/src/modules/notifications/__tests__/NotificationsRoutes.test.ts`: inside the `prisma` mock object, directly after `plan: { findUnique: vi.fn(async () => null) },`, add `    featureFlag: { findUnique: vi.fn(async () => null) },`. Nothing else.

Create `backend/src/modules/notifications/__tests__/NotificationsFeatureFlag.test.ts`. Copy the seven `vi.mock` blocks of `NotificationsRoutes.test.ts` (env, jwtValidator, prisma, redisAppClient, rateLimitStore, express-rate-limit, IdentityProviderRegistry) and its `buildApp()`, with: a hoisted `const state = vi.hoisted(() => ({ flags: {} as Record<string, boolean> }))`, reset to `{}` in `beforeEach` with `vi.clearAllMocks()`; and in the prisma mock `featureFlag: { findUnique: vi.fn(async ({ where }: any) => (where.key in state.flags ? { enabled: state.flags[where.key] } : null)) }`. Import `prisma` from `'../../../infrastructure/db/prisma'` to assert on it. Tests:

- `state.flags.NOTIFICATIONS = false`; `POST /api/v1/notifications/telegram/link-code` with `Authorization: Bearer test-token` → 503, `res.body.code === 'FEATURE_DISABLED'`, `prisma.user.update` not called.
- same flag; `POST /api/v1/notifications/test` with the token → 503, `code: 'FEATURE_DISABLED'`.
- same flag; `POST /api/v1/notifications/test` with no `Authorization` → 401.
- no flag row; link-code with the token → 200 and `res.body.code` matches `/^[A-HJ-NP-Z2-9]{8}$/`.

**Files**
- `backend/src/modules/notifications/presentation/routes.ts` — edit: insertions
- `backend/src/modules/notifications/__tests__/NotificationsRoutes.test.ts` — edit: one mock line
- `backend/src/modules/notifications/__tests__/NotificationsFeatureFlag.test.ts` — new

**Acceptance**

Copied from this task's `acceptance` array in `tasks.json` — identical after the emphasis normalization defined in `agents/blueprint-writer.md` *Acceptance strings*.

1. **WHEN** the `NOTIFICATIONS` flag row has `enabled: false` and an authenticated `POST /api/v1/notifications/telegram/link-code` arrives **THE SYSTEM SHALL** respond 503 with `code: 'FEATURE_DISABLED'` and SHALL NOT write to `users`.
2. **WHEN** the `NOTIFICATIONS` flag row has `enabled: false` and an authenticated `POST /api/v1/notifications/test` arrives **THE SYSTEM SHALL** respond 503 with `code: 'FEATURE_DISABLED'`.
3. **WHEN** the `NOTIFICATIONS` flag is disabled and the request has no `Authorization` header **THE SYSTEM SHALL** respond 401, because the existing auth chain runs before the flag check.
4. **WHEN** no `NOTIFICATIONS` row exists **THE SYSTEM SHALL** issue a link code with status 200, and `NotificationsRoutes.test.ts` and the whole `src/modules/notifications` suite SHALL exit 0.
5. **WHEN** `backend/src/modules/notifications/presentation/routes.ts` is compared with the previous step **THE SYSTEM SHALL** show zero removed lines and exactly 2 lines reading `  requireNotificationsEnabled,`.

**Verify** — every command, in order, run from the project root. Each one exits 0 when this task is correct.

```bash
(cd backend && npx vitest run src/modules/notifications/__tests__/NotificationsFeatureFlag.test.ts src/modules/notifications/__tests__/NotificationsRoutes.test.ts)
(cd backend && npx vitest run src/modules/notifications)
test "$(grep -c '^  requireNotificationsEnabled,$' backend/src/modules/notifications/presentation/routes.ts)" -eq 2
git rev-parse --verify -q HEAD >/dev/null && test -z "$(git diff -U0 HEAD -- backend/src/modules/notifications/presentation/routes.ts | grep -E '^-([^-]|$)')"
(cd backend && npx tsc --noEmit)
```

**Checkpoint**

```bash
git add -A && git commit -m "E1-T5: Gate notifications routes behind NOTIFICATIONS"
git tag step-05-notifications-flag
```

Rollback target before this task: `step-04-seed-feature-flags`.

### `E1-T6` — Gate analytics routes behind ANALYTICS

**Depends on:** `E1-T2` · **Priority:** p1 — metadata for scope cuts, not a running order

Edit `backend/src/modules/analytics/presentation/routes.ts`:

1. After `import { requireCapability } from '../../identity/presentation/requireCapability';` add `import { requireFeatureEnabled } from '../../platform/presentation/requireFeatureEnabled';`
2. After `const requireAnalytics = requireCapability('USE_ANALYTICS');` add `const requireAnalyticsEnabled = requireFeatureEnabled('ANALYTICS');`
3. In each of the 12 route lines replace `requireAnalytics, (req, res)` with `requireAnalytics, requireAnalyticsEnabled, (req, res)`. Nothing else on those lines changes.

The capability check runs before the flag, so a caller without `USE_ANALYTICS` keeps getting 403.

Create `backend/src/modules/analytics/__tests__/AnalyticsRoutes.test.ts`. It also serves `E3-T6`, so it mocks everything that task's wiring will import:

```ts
const state = vi.hoisted(() => ({
  flags: {} as Record<string, boolean>,
  sessionCapabilities: ['USE_ANALYTICS'] as string[],
  apiKeyRow: null as any,
}));
```

- `vi.mock('../../../infrastructure/config/env', () => ({ config: {} }))`
- `vi.mock('../../../infrastructure/security/jwtValidator', () => ({ jwtValidator: { verify: vi.fn(async () => ({ sub: '00000000-0000-0000-0000-000000000001' })) } }))`
- `vi.mock('../../../infrastructure/db/prisma', …)` with:
  - `user.upsert: vi.fn(async () => ({ id: '00000000-0000-0000-0000-000000000001', email: 'analyst@test.com', name: null, roles: ['USER'], phone: null, telegramUsername: null, notifyEmail: false, notifyTelegram: false, notifySms: false, planId: null, planExpiresAt: null, plan: { name: 'PROFESIONAL', maxFavoriteEntities: 10, capabilities: state.sessionCapabilities.map((name) => ({ capability: { name } })) } }))`
  - `plan.findUnique: vi.fn(async () => null)`
  - `featureFlag.findUnique: vi.fn(async ({ where }: any) => (where.key in state.flags ? { enabled: state.flags[where.key] } : null))`
  - `apiKey: { findUnique: vi.fn(async () => state.apiKeyRow), update: vi.fn(async () => ({})) }`
- `vi.mock('../../../infrastructure/redis/redisAppClient', () => ({ redisAppClient: {} }))`
- `vi.mock('../../../infrastructure/security/rateLimitStore', () => ({ FallbackRedisStore: class {} }))`
- `vi.mock('express-rate-limit', () => ({ default: () => (_req: any, _res: any, next: any) => next() }))`
- `vi.mock('../../../infrastructure/logger', () => ({ logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() } }))`
- `vi.mock('../../identity/infrastructure/IdentityProviderRegistry', () => ({ IdentityProviderRegistry: { resolve: () => ({ getUser: async () => ({ id: '00000000-0000-0000-0000-000000000001', email: 'analyst@test.com', roles: ['USER'], permissions: [] }) }) } }))`
- `vi.mock('../application/AnalyticsService', () => ({ AnalyticsService: class {} }))`
- the controller Proxy mock shown in *Conventions* above.

`beforeEach`: `vi.clearAllMocks()`, `state.flags = {}`, `state.sessionCapabilities = ['USE_ANALYTICS']`, `state.apiKeyRow = null`. `buildApp()` imports `analyticsRouter` from `'../presentation/routes'` and mounts it at `/api/v1/analytics` on a fresh `express()` with `express.json()`.

`const ROUTES` = `/persons/supplier-doc-types`, `/persons/900123456`, `/suppliers/top-by-count`, `/suppliers/top-by-value`, `/departments/contracts`, `/departments/spending`, `/contracts/by-modality`, `/contracts/by-type`, `/contracts/by-status`, `/entities/top-by-count`, `/entities/top-by-spending`, `/contracts/trends`.

Tests (session token `Authorization: Bearer test-token`):

- `it.each(ROUTES)`: session, no flag row → 200 and `res.body.userId === '00000000-0000-0000-0000-000000000001'`.
- `state.flags.ANALYTICS = false`; `GET /api/v1/analytics/contracts/trends` → 503, `code: 'FEATURE_DISABLED'`.
- `state.sessionCapabilities = []`, `state.flags.ANALYTICS = false` → 403 with body exactly `{ error: 'Forbidden: Requires USE_ANALYTICS capability' }`.
- no `Authorization` → 401 with body exactly `{ error: 'Missing or invalid Authorization header' }`.

**Files**
- `backend/src/modules/analytics/presentation/routes.ts` — edit
- `backend/src/modules/analytics/__tests__/AnalyticsRoutes.test.ts` — new

**Acceptance**

Copied from this task's `acceptance` array in `tasks.json` — identical after the emphasis normalization defined in `agents/blueprint-writer.md` *Acceptance strings*.

1. **WHEN** each of the 12 analytics `GET` routes is called with a session whose plan grants `USE_ANALYTICS` and no `ANALYTICS` flag row exists **THE SYSTEM SHALL** respond 200 from the controller.
2. **WHEN** the `ANALYTICS` flag row has `enabled: false` **THE SYSTEM SHALL** respond 503 with `code: 'FEATURE_DISABLED'` to an authorized `GET /api/v1/analytics/contracts/trends`.
3. **WHEN** the session user's plan lacks `USE_ANALYTICS` **THE SYSTEM SHALL** respond 403 `{ error: 'Forbidden: Requires USE_ANALYTICS capability' }`, even while the flag is disabled.
4. **WHEN** no `Authorization` header is sent **THE SYSTEM SHALL** respond 401 `{ error: 'Missing or invalid Authorization header' }`.
5. **WHEN** `backend/src/modules/analytics/presentation/routes.ts` is searched **THE SYSTEM SHALL** find exactly 12 lines containing `requireAnalytics, requireAnalyticsEnabled, (req, res)` and the unchanged line `const requireAnalytics = requireCapability('USE_ANALYTICS');`.

**Verify** — every command, in order, run from the project root. Each one exits 0 when this task is correct.

```bash
(cd backend && npx vitest run src/modules/analytics/__tests__/AnalyticsRoutes.test.ts)
test "$(grep -cF 'requireAnalytics, requireAnalyticsEnabled, (req, res)' backend/src/modules/analytics/presentation/routes.ts)" -eq 12
grep -qF "const requireAnalytics = requireCapability('USE_ANALYTICS');" backend/src/modules/analytics/presentation/routes.ts
(cd backend && npx tsc --noEmit)
```

**Checkpoint**

```bash
git add -A && git commit -m "E1-T6: Gate analytics routes behind ANALYTICS"
git tag step-06-analytics-flag
```

Rollback target before this task: `step-05-notifications-flag`.

---

## Epic done when

All six tasks are `done` in `tasks.json`, their six tags exist, and `(cd backend && npx tsc --noEmit)` plus `(cd backend && npx vitest run src/modules/platform src/modules/analytics/__tests__/AnalyticsRoutes.test.ts)` exit 0.
