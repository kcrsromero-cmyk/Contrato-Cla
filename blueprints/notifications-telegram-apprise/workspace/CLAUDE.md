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
| Dev API | `(cd backend && npm run dev)` — http://localhost:4000, reads `backend/.env` |
| Dev worker | `(cd backend && npx tsx src/worker.ts)` — reads `backend/.env` |
| Local services | `docker compose up -d db redis apprise` · stop: `docker compose stop db redis apprise` |
| Migrations | production: the `migrator` compose service (`sh scripts/migrate.sh` → `prisma migrate deploy`). Never run by hand against production |

**Gate:** `(cd backend && npx tsc --noEmit)` plus the vitest files for the area you changed must exit 0 before any task is marked done. There is no lint or format tool in this repo — do not add one.

Runtime: Node 22 (`node:22-alpine` in `backend/Dockerfile`). Dependency versions live in `backend/package-lock.json` — read it, never guess one.

## Active change

`blueprints/notifications-telegram-apprise/` — build order in `tasks.json`, one epic file per group of tasks in `epics/`. Pick the first ready task in `tasks.json` array order. Verify commands run from the repository root.

## Stack

TypeScript (CommonJS, Node16 resolution) · Express 4 · Prisma 6 on Postgres 15 · zod 4 · winston · BullMQ on Redis · Supabase JWT auth · Apprise API for notifications · vitest 4 · Coolify + docker compose.

## Architecture

**Processes.** One codebase, three processes:
- `backend/src/server.ts` — the HTTP API (`backend` service).
- `backend/src/worker.ts` — BullMQ workers plus the Telegram link gateway (`worker` service).
- `migrator` — a one-shot `prisma migrate deploy`.

**Request path.** client → `server.ts` (helmet → `blockedPathsMiddleware` → global limiter → cors → `express.json` → morgan → `AuditMiddleware`) → `modules/<m>/presentation/routes.ts` (`authMiddleware.handle` → `currentUserResolver.resolve` → limiter → `validateRequest(schema)` → controller) → `modules/<m>/application/*Service.ts` → `modules/<m>/infrastructure/*` adapter or `infrastructure/db/prisma.ts` → Postgres / external HTTP.

**Module layout** — every module under `backend/src/modules/<name>/`:

| Layer | Holds | May import | Must never |
|---|---|---|---|
| `domain/` | pure interfaces, types, errors, constants | other `domain/` files, `node:` built-ins | Prisma, Express, `config` |
| `application/` | business logic services | `domain/`, own `infrastructure/*Registry`, `import type` from `@prisma/client` | `config`, Express |
| `infrastructure/` | concrete adapters + a static `*Registry` | `domain/`, `logger` | `config` (adapters take options in the constructor) |
| `presentation/` | `routes.ts`, controllers, zod `*Schemas.ts` | everything above, `config`, identity's `AuthMiddleware` / `CurrentUserResolver` / `ValidationMiddleware` | editing another module's files |
| `__tests__/` | vitest tests for that module | anything, with `vi.mock` | the network, a database |

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

## Rules

Deferred conventions — read the matching file before editing that area:

| File | Applies to |
|---|---|
| `.claude/rules/notifications-module.md` | `backend/src/modules/notifications/**` |
| `.claude/rules/prisma-migrations.md` | `backend/prisma/**` |
| `.claude/rules/backend-tests.md` | `backend/src/**/__tests__/**` |
| `.claude/rules/env-config.md` | `backend/src/infrastructure/config/**`, `.env.example` files, `docker-compose.yml` |

Project skill: `.claude/skills/add-notifier-adapter/SKILL.md` — adding a new notification channel.

## Non-negotiable

1. **Frozen:** `PATCH /api/v1/auth/profile` (its zod schema and behaviour), `CurrentUserResolver`'s selected fields, and the columns `telegram_username`, `notify_email`, `notify_telegram`, `notify_sms`. Do not edit `AuthController.ts` or `CurrentUserResolver.ts`.
2. **Migrations are additive and hand-authored.** Never edit an existing migration directory. Never run `prisma migrate dev`, `migrate reset` or `db push` against a shared database.
3. **Never log or return the Telegram bot token or an outbound request URL/body. Never log a link code or chat id, and never return either one except the caller's own freshly issued code in the POST /telegram/link-code response.**
4. **Every env var goes through `EnvSchema`** and both `.env.example` files. Wire it into compose for every service that reads it.
5. Never commit secrets, `.env`, or `dist/`.
6. Never mark a task done with a failing verify command, and never edit a verify command to make it pass.
