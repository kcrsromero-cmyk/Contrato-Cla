# Contrata360

Colombian public-procurement analytics (SECOP open data via Socrata): an Express + Prisma API and a BullMQ worker in `backend/`, a frontend in `frontend/`, deployed from the root `docker-compose.yml` through Coolify.

## Commands

Run everything from the repository root. Backend commands use a subshell so they can be pasted together.

| Task | Command |
|---|---|
| Install backend deps | `(cd backend && npm ci)` |
| Generate Prisma client | `(cd backend && npx prisma generate)` — needs no database |
| Typecheck | `(cd backend && npx tsc --noEmit)` — tests are excluded by `tsconfig.json` |
| Build | `(cd backend && npm run build)` → `backend/dist/server.js`, `backend/dist/worker.js` |
| Tests, whole suite | `(cd backend && npx vitest run)` |
| Tests, one module | `(cd backend && npx vitest run src/modules/notifications)` |
| Tests, one file | `(cd backend && npx vitest run src/modules/notifications/__tests__/AppriseNotifier.test.ts)` |
| Tests, seed | `(cd backend && npx vitest run src/__tests__/seed.test.ts)` — runs `prisma/seed.ts` against a mocked `PrismaClient` |
| Typecheck seed | `(cd backend && npx tsc --noEmit --strict --esModuleInterop --skipLibCheck --target ES2022 --module node16 --moduleResolution node16 prisma/seed.ts)` — `tsconfig.json` covers only `src/` |
| Dev API | `(cd backend && npm run dev)` — http://localhost:4000, reads `backend/.env` |
| Dev worker | `(cd backend && npx tsx src/worker.ts)` — reads `backend/.env` |
| Local services | `docker compose up -d db redis apprise` · stop: `docker compose stop db redis apprise` |
| Migrations | production: the `migrator` compose service (`sh scripts/migrate.sh` → `prisma migrate deploy`). Never run by hand against production |
| Seed | `(cd backend && npx prisma db seed)` — not run by `migrator`; an operator runs it after a deploy that changes seed data. Never from an agent session against a shared database |

**Gate:** `(cd backend && npx tsc --noEmit)` plus the vitest files for the area you changed must exit 0 before any task is marked done. There is no lint or format tool in this repo — do not add one.

Runtime: Node 22 (`node:22-alpine` in `backend/Dockerfile`). Dependency versions live in `backend/package-lock.json` — read it, never guess one.

## Active change

`blueprints/api-platform-and-flags/` — build order in `tasks.json`, one epic file per group of tasks in `epics/`. Pick the first ready task in `tasks.json` array order. Verify commands run from the repository root. The previous change, `blueprints/notifications-telegram-apprise/`, is built (tags `step-01-env-schema` … `step-12-worker-gateway`) and kept for reference.

## Stack

TypeScript (CommonJS, Node16 resolution) · Express 4 · Prisma 6 on Postgres 15 · zod 4 · winston · BullMQ on Redis · Supabase JWT auth · Apprise API for notifications · vitest 4 · Coolify + docker compose.
Added by the api-platform change: API keys hashed with SHA-256 (`node:crypto`), database feature flags (`feature_flags`), per-key rate limits (express-rate-limit 8 + `FallbackRedisStore`).

## Architecture

**Processes.** One codebase, three processes:
- `backend/src/server.ts` — the HTTP API (`backend` service).
- `backend/src/worker.ts` — BullMQ workers plus the Telegram link gateway (`worker` service).
- `migrator` — a one-shot `prisma migrate deploy`.

**Request path.** client → `server.ts` (helmet → `blockedPathsMiddleware` → global limiter → cors → `express.json` → morgan → `AuditMiddleware`) → `modules/<m>/presentation/routes.ts` (`authMiddleware.handle` → `currentUserResolver.resolve` → limiter → `validateRequest(schema)` → controller) → `modules/<m>/application/*Service.ts` → `modules/<m>/infrastructure/*` adapter or `infrastructure/db/prisma.ts` → Postgres / external HTTP.

**API keys.** On the 7 protected `procurement` routes and the 12 `analytics` routes, `authenticate = authenticateApiKeyOrSession([authMiddleware.handle, currentUserResolver.resolve])` (from `identity/presentation/apiKeyAuth.ts`) replaces the session pair. `Authorization: Bearer ck_live_…` runs `ApiKeyAuthMiddleware.handle` (flag `API_ACCESS` → SHA-256 lookup → revoked? → `ApiKeyUserMapper` builds the same `AuthenticatedUser` → `USE_API` check) and then the per-key limiter (`rl:apikey:`, `plans.api_requests_per_minute`, fallback 10). Any other header runs the session pair unchanged. `/api/v1/auth/api-keys` (POST/GET/DELETE) is session-only: `requireSessionAuth` runs first.

**Feature flags.** `modules/platform/`: `domain/featureFlags.ts` (keys `NOTIFICATIONS`, `ANALYTICS`, `API_ACCESS`; the 503 `FEATURE_DISABLED` body), `application/isFeatureEnabled.ts` (missing row = enabled), `presentation/requireFeatureEnabled.ts` (middleware; `checkFeatureEnabled` fails open on lookup errors). Rows are toggled by SQL only.

**Module layout** — every module under `backend/src/modules/<name>/`:

| Layer | Holds | May import | Must never |
|---|---|---|---|
| `domain/` | pure interfaces, types, errors, constants | other `domain/` files, `node:` built-ins | Prisma, Express, `config` |
| `application/` | business logic services | `domain/`, own `infrastructure/*Registry`, `import type` from `@prisma/client` | `config`, Express |
| `infrastructure/` | concrete adapters + a static `*Registry` | `domain/`, `logger` | `config` (adapters take options in the constructor) |
| `presentation/` | `routes.ts`, controllers, zod `*Schemas.ts` | everything above, `config`, identity's `AuthMiddleware` / `CurrentUserResolver` / `ValidationMiddleware` | editing another module's files |
| `__tests__/` | vitest tests for that module | anything, with `vi.mock` | the network, a database |

Cross-module imports added by the api-platform change: any `presentation/` may import `platform/presentation/requireFeatureEnabled` and `identity/presentation/apiKeyAuth`; `identity/presentation/ApiKeyAuthMiddleware.ts` imports `platform/domain/featureFlags`.

**Ports and adapters.** `identity/` is the reference: `domain/IdentityProvider.ts` (port) → `infrastructure/IdentityProviderRegistry.ts` (static `Map`, `register(name, x)`, `resolve(name?)` with a default) → `infrastructure/SupabaseIdentityProvider.ts` (adapter). `notifications/` mirrors it with `Notifier` → `NotifierRegistry` (default `apprise`) → `AppriseNotifier`.

**Where things live.**

| Concern | Single source of truth |
|---|---|
| DB schema | `backend/prisma/schema.prisma`, then a new migration directory in `backend/prisma/migrations/` |
| Env access | `backend/src/infrastructure/config/env.ts` (`EnvSchema`, validated at import, exits 1 if invalid). Never read `process.env` elsewhere |
| Logging | `backend/src/infrastructure/logger.ts` (`logger`) |
| DB client | `backend/src/infrastructure/db/prisma.ts` (`prisma`) |
| Authenticated user | `(req as any).user`, set by `CurrentUserResolver` |
| API prefix | `API_PREFIX = '/api/v1'` in `server.ts` |
| Worker shutdown | `gracefulShutdown` in `worker.ts`: workers → queues → Redis → Prisma → exit |
| Feature flags | `feature_flags` table, read through `modules/platform/` |
| API-key auth wiring | `identity/presentation/apiKeyAuth.ts` (`authenticateApiKeyOrSession`, `apiKeyService`) |
| Plan rules for API-key users | `identity/application/ApiKeyUserMapper.ts` — mirrors `CurrentUserResolver`, parity-tested |
| API-key context for the limiter | `(req as any).apiKey = { id, apiRequestsPerMinute }`, set by `ApiKeyAuthMiddleware` |

## Code rules

1. **Relative, extensionless imports** (`'../domain/Notifier'`). No path alias. `node:` prefix for built-ins.
2. **Validate at the edge.** Every route body goes through `validateRequest(<zod schema>)` from `identity/presentation/ValidationMiddleware.ts`.
3. **Errors are typed classes** in `domain/errors.ts`. Controllers map them to HTTP. The body is `{ error: string }`, plus `code` where the module defines one.
4. **Adapters never import `config`.** `routes.ts` / `worker.ts` read `config` and pass values into the constructor.
5. **Registries resolve at call time**, not at module load, inside services.
6. **Use the global `fetch`** for outbound HTTP. No new HTTP client dependency.
7. **No new npm dependency** without a reason in the commit message.
8. **User-facing strings are Spanish.** Identifiers, logs and code comments are English.
9. **Max 300 lines per file.** Longer means split by responsibility.
10. **Seed edits are insertions.** Never change or remove an existing `seed.ts` line; feature-flag upserts use `update: {}`.

## Environment

| Variable | Required | Used by | Source |
|---|---|---|---|
| `DATABASE_URL`, `REDIS_URL` | yes | Prisma, BullMQ, Redis clients | compose / `backend/.env` |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `AUTH_JWKS_URL` | yes | identity module, `jwtValidator` | Supabase project |
| `FRONTEND_URL` | yes | CORS in `server.ts` | deploy |
| `SOCRATA_APP_TOKEN`, `SOCRATA_DATASET_URL` | yes | procurement module | Socrata |
| `TELEGRAM_BOT_TOKEN` | yes | `notifications/presentation/routes.ts`, `worker.ts` | @BotFather `/newbot` |
| `TELEGRAM_BOT_USERNAME` | no (default `''`) | `botDeepLink` in link-code responses | @BotFather |
| `APPRISE_URL` | no (default `http://apprise:8000`) | `AppriseNotifier` via `routes.ts` | compose (`http://localhost:8008` from the host) |
| `PORT`, `LOG_LEVEL`, `NODE_ENV` | no (defaults) | `server.ts`, `logger` | — |

`backend/.env.example` and the root `.env.example` are committed and stay in sync with `EnvSchema`. Real `.env` files never are.
The api-platform change adds no environment variable: the key prefix is a constant and SHA-256 needs no secret.

## Rules

Deferred conventions — read the matching file before editing that area:

| File | Applies to |
|---|---|
| `.claude/rules/notifications-module.md` | `backend/src/modules/notifications/**` |
| `.claude/rules/prisma-migrations.md` | `backend/prisma/**` |
| `.claude/rules/backend-tests.md` | `backend/src/**/__tests__/**` |
| `.claude/rules/env-config.md` | `backend/src/infrastructure/config/**`, `.env.example` files, `docker-compose.yml` |
| `.claude/rules/api-keys.md` | identity API-key files, procurement and analytics `routes.ts` |
| `.claude/rules/feature-flags.md` | `backend/src/modules/platform/**`, the routes that use a flag |
| `.claude/rules/prisma-new-tables.md` | `backend/prisma/**` — new tables, foreign keys, seed edits |

Project skill: `.claude/skills/add-notifier-adapter/SKILL.md` — adding a new notification channel.
Project skill: `.claude/skills/add-feature-flag/SKILL.md` — adding a new kill switch to a route.

## Non-negotiable

1. **Frozen:** `PATCH /api/v1/auth/profile` (its zod schema and behaviour), `CurrentUserResolver`'s selected fields, and the columns `telegram_username`, `notify_email`, `notify_telegram`, `notify_sms`. Do not edit `AuthController.ts` or `CurrentUserResolver.ts`.
2. **Migrations are additive and hand-authored.** Never edit an existing migration directory. Never run `prisma migrate dev`, `migrate reset` or `db push` against a shared database.
3. **Never log or return the Telegram bot token or an outbound request URL/body. Never log a link code or chat id, and never return either one except the caller's own freshly issued code in the POST /telegram/link-code response.**
4. **Every env var goes through `EnvSchema`** and both `.env.example` files. Wire it into compose for every service that reads it.
5. Never commit secrets, `.env`, or `dist/`.
6. Never mark a task done with a failing verify command, and never edit a verify command to make it pass.
7. **Never store, log or return an API key's plaintext** except once, in the `POST /api/v1/auth/api-keys` 201 response. Store only the SHA-256 `key_hash` and the 12-char `key_prefix`. Never log the `Authorization` header, a key, its hash or its prefix.
8. **An API key can never manage API keys**, and `AuthenticatedUser` is unchanged: the API-key path builds the same shape through `ApiKeyUserMapper.ts`, which must stay identical to `CurrentUserResolver`'s plan rules (its parity test proves it).
9. **Feature flags are default-open and database-only.** A missing row means enabled. No endpoint creates, updates or deletes `feature_flags` rows.
10. **Frozen:** `server.ts`, every existing IP-based limiter, the session chain on every route, and `Organization` / `organizationId` (out of scope — the API-key path never sets it).
