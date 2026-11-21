# Epic 01: Foundation — config, data, port and adapter

> After this epic the backend validates the Telegram/Apprise configuration, compose passes it to both processes, `users` carries the three Telegram link columns, and a tested `Notifier` port, registry and Apprise adapter exist.

| | |
|---|---|
| **Epic id** | `01-foundation` |
| **Tasks** | `E1-T1` … `E1-T5` |
| **Depends on** | nothing — start here |
| **Unlocks** | `02-delivery-and-linking` |
| **Parallel with** | nothing (02 consumes this epic's outputs) |

You do not need any other file to complete this epic. Everything below is repeated here on purpose.

---

## Stack

Express 4 · TypeScript (CommonJS, `module`/`moduleResolution` Node16, target ES2022, `strict`) · no styling (backend only) · Postgres 15 · Prisma 6 · Supabase JWT auth (existing) · Coolify + docker compose.
Package manager: `npm` (in `backend/`). Runtime: Node 22 (`node:22-alpine` in `backend/Dockerfile`, no `.nvmrc`). Dependency versions are in `backend/package-lock.json` — read it, never guess one. **This change adds no npm dependency**: outbound HTTP uses Node 22's global `fetch`.

All commands run from the **repository root** (the directory with `docker-compose.yml`, `backend/`, `blueprints/`).

| Task | Command |
|---|---|
| Install | `(cd backend && npm ci)` |
| Prisma client | `(cd backend && npx prisma generate)` — no database needed |
| Typecheck | `(cd backend && npx tsc --noEmit)` |
| Lint | NOT CONFIGURED in this repo — there is no lint gate; do not add one |
| Test (one file) | `(cd backend && npx vitest run src/modules/notifications/__tests__/<File>.test.ts)` |
| Test (module) | `(cd backend && npx vitest run src/modules/notifications)` |
| Local services | none needed — no task in this epic touches Postgres, Redis, Apprise or the network |

**Gate:** `(cd backend && npx tsc --noEmit)` and the task's own vitest file(s) pass before any task here is marked done.

No task in this epic verifies against a real service. Never start one and never point a Prisma command at a database.

## Directory subtree

Only the parts this epic touches:

```
.env.example                                          # exists — you will edit it (E1-T1)
docker-compose.yml                                    # exists — you will edit it (E1-T2)
backend/
  .env.example                                        # exists — you will edit it (E1-T1)
  prisma/
    schema.prisma                                     # exists — you will edit it (E1-T3)
    migrations/
      20261120000000_add_telegram_notification_fields/
        migration.sql                                 # NEW, hand-authored (E1-T3)
  src/
    __tests__/apiRoutes.test.ts                       # exists — you will edit it (E1-T1)
    infrastructure/config/env.ts                      # exists — you will edit it (E1-T1)
    modules/identity/                                 # exists, read-only — the pattern to mirror
    modules/notifications/
      domain/Notifier.ts                              # NEW — the port (E1-T4)
      domain/errors.ts                                # NEW — typed errors (E1-T4)
      infrastructure/NotifierRegistry.ts              # NEW — static registry (E1-T4)
      infrastructure/AppriseNotifier.ts               # NEW — Apprise adapter (E1-T5)
      __tests__/NotificationsEnv.test.ts              # NEW — proves the env keys (E1-T1)
      __tests__/NotifierRegistry.test.ts              # NEW — proves registry + errors (E1-T4)
      __tests__/AppriseNotifier.test.ts               # NEW — proves the Apprise request (E1-T5)
```

Everything outside this subtree is out of scope. In particular **never edit** `backend/src/modules/identity/**` (frozen: `AuthController.ts`, `CurrentUserResolver.ts`, `AuthenticatedUser.ts`). If a task seems to require editing a file not listed here, stop and report.

## Data model touched here

| Entity | Fields this epic adds or reads | Notes |
|---|---|---|
| `User` → table `users` | adds `telegramChatId String? @map("telegram_chat_id")`, `telegramLinkCode String? @unique @map("telegram_link_code")`, `telegramLinkCodeExpiresAt DateTime? @map("telegram_link_code_expires_at")` | all nullable; unique index `users_telegram_link_code_key`. FROZEN neighbours, untouched: `telegramUsername`, `notifyEmail`, `notifyTelegram`, `notifySms` |

## Contracts

**Consumed** — already exists, do not rebuild:

| From | Interface | Guarantee |
|---|---|---|
| repo | `backend/src/infrastructure/config/env.ts` → `config` | `dotenv.config()` then `EnvSchema.safeParse(process.env)`; on failure prints `[FATAL] Invalid or missing environment variables` and calls `process.exit(1)` **at import time** |
| repo | `backend/src/modules/identity/infrastructure/IdentityProviderRegistry.ts` | the registry shape to copy: `private static providers = new Map<…>()`, `private static defaultProviderName`, `static register(name, x)`, `static resolve(name?)` throwing ``new Error(`Identity provider '${targetName}' is not registered.`)`` |
| repo | `docker-compose.yml` `backend`/`worker` env | each already has `- APPRISE_URL=http://apprise:8000`; Apprise listens on `http://apprise:8000` in-stack and `127.0.0.1:8008` on the host |

**Produced** — the next epic depends on exactly these signatures:

| Export | Signature | Used by |
|---|---|---|
| `env.ts` → `config` | adds `APPRISE_URL: string` (default `'http://apprise:8000'`), `TELEGRAM_BOT_TOKEN: string` (required, non-empty), `TELEGRAM_BOT_USERNAME: string` (default `''`) | `02-delivery-and-linking` (routes, worker) |
| `domain/Notifier.ts` → `Notifier` | `interface Notifier { send(recipient: string, message: string, title?: string): Promise<void>; }` | `02` |
| `domain/errors.ts` → `NotificationChannelNotLinkedReason` | `'TELEGRAM_NOT_LINKED' \| 'TELEGRAM_DISABLED'` | `02` |
| `domain/errors.ts` → `NotificationChannelNotLinkedError` | `class extends Error { readonly name = 'NotificationChannelNotLinkedError'; constructor(readonly reason: NotificationChannelNotLinkedReason) }` | `02` |
| `domain/errors.ts` → `NotificationDeliveryError` | `class extends Error { readonly name = 'NotificationDeliveryError'; constructor(message: string, readonly status?: number) }` | `02` |
| `infrastructure/NotifierRegistry.ts` → `NotifierRegistry` | `static register(name: string, notifier: Notifier): void` · `static resolve(name?: string): Notifier` (default `'apprise'`) | `02` |
| `infrastructure/AppriseNotifier.ts` → `AppriseNotifier`, `AppriseNotifierOptions` | `new AppriseNotifier({ baseUrl: string; botToken: string; timeoutMs?: number })` implements `Notifier` | `02` (routes) |
| Prisma client | `User.telegramChatId: string \| null`, `User.telegramLinkCode: string \| null`, `User.telegramLinkCodeExpiresAt: Date \| null` | `02` |

## Conventions that bite in this area

- **`env.ts` exits the process at import.** Any test whose import graph reaches it must mock it or set every required key itself with `dotenv` mocked. That is why adapters take config through constructor options and never import `config`.
- **Imports are relative and extensionless** (`'../domain/Notifier'`), no alias, `node:` prefix for built-ins. CommonJS output.
- **Migrations in this repo are hand-authored** with a hand-picked timestamp directory and `ADD COLUMN IF NOT EXISTS` SQL. Never run `prisma migrate dev`, `migrate reset`, `db push` or `migrate deploy`. They need a database, and `migrate dev` can block on an interactive reset prompt.
- **zod is v4.** In `EnvSchema` keep the file's existing `z.string().url()` / `.min(1)` / `.default()` style.
- **vitest 4, no config file.** A mock used with `new` needs a `class` implementation. `vi.mock` factories are hoisted, so use `vi.hoisted` for shared state.
- **Never log the bot token** or any URL/body containing it.

Full project rules: `CLAUDE.md`. Area rules: `.claude/rules/env-config.md`, `.claude/rules/prisma-migrations.md`, `.claude/rules/backend-tests.md`, `.claude/rules/notifications-module.md`. All of these sit in the repo root: the builder copied them there from the bundle's `workspace/` before task one, with `rsync -a --ignore-existing blueprints/notifications-telegram-apprise/workspace/ ./`.

---

## Tasks

Listed in the same order as `tasks.json`. That order is the build order — work top to bottom and do not re-rank by priority or by what looks quick.

### `E1-T1` — Add Telegram and Apprise vars to the env schema

**Depends on:** nothing · **Priority:** p0 — metadata for scope cuts, not a running order

Edit `EnvSchema` in `backend/src/infrastructure/config/env.ts`. Add exactly these three keys after `SOCRATA_DATASET_URL`, aligned like their neighbours, and change no other line:

```ts
  APPRISE_URL:              z.string().url().default('http://apprise:8000'),
  TELEGRAM_BOT_TOKEN:       z.string().min(1),
  TELEGRAM_BOT_USERNAME:    z.string().default(''),
```

The token stays required with no default, so a missing token fails boot loudly.

Append to `backend/.env.example`, after the `# Server` block:

```
# Notifications (Telegram via Apprise)
APPRISE_URL="http://localhost:8008"
TELEGRAM_BOT_TOKEN=""
TELEGRAM_BOT_USERNAME=""
```

Append to the root `.env.example`:

```
# Notifications — Telegram bot from @BotFather (token required by backend and worker)
TELEGRAM_BOT_TOKEN=""
TELEGRAM_BOT_USERNAME=""
```

In `backend/src/__tests__/apiRoutes.test.ts`, insert these two lines directly after `process.env.NODE_ENV = 'test';`, so that file's hand-written env-var list stays complete for readers. They have **no runtime effect on `env.ts`'s validation**: ES imports are hoisted, so the file's static `import app from '../server'` runs `env.ts` (and its `dotenv.config()`) before these lines execute. **Note:** the local `backend/.env` used when running the full test suite must set `TELEGRAM_BOT_TOKEN` to any non-empty value, otherwise `apiRoutes.test.ts` (which loads the real env via `dotenv` through the actual server import) newly fails against the `notifications-baseline` comparison (blueprint §10, §13, §20.1):

```ts
process.env.TELEGRAM_BOT_TOKEN = 'test';
process.env.APPRISE_URL = 'http://localhost:8008';
```

Write `backend/src/modules/notifications/__tests__/NotificationsEnv.test.ts`:

- `vi.mock('dotenv', () => ({ default: { config: () => ({}) }, config: () => ({}) }))`, so no local `.env` leaks in.
- Snapshot `process.env` in `beforeEach` and restore it in `afterEach`. In `beforeEach`, also call `vi.resetModules()` and set every pre-existing required key:
  - `DATABASE_URL='postgresql://test:test@localhost:5432/test'`
  - `REDIS_URL='redis://localhost:6379'`
  - `SUPABASE_URL='http://localhost:8000'`
  - `SUPABASE_PUBLISHABLE_KEY='anon'`
  - `AUTH_JWKS_URL='http://localhost:8000'`
  - `FRONTEND_URL='http://localhost:3000'`
  - `SOCRATA_APP_TOKEN='test'`
  - `SOCRATA_DATASET_URL='http://localhost'`
- Load the module with `await import('../../../infrastructure/config/env')` inside each test.
- Test 1: `TELEGRAM_BOT_TOKEN='123456:TEST'`, with `APPRISE_URL` and `TELEGRAM_BOT_USERNAME` deleted, and `delete process.env.PORT;` so a `PORT` exported in the shell cannot leak in. Assert the three values in criterion 1, and also `config.PORT === '4000'`.
- Tests 2 and 3: spy `process.exit` to throw `new Error('process.exit:' + code)` and silence `console.error`. Assert the import rejects with `process.exit:1`:
  - Test 2: `TELEGRAM_BOT_TOKEN=''`.
  - Test 3: a valid token with `APPRISE_URL='not-a-url'`.

**Files**
- `backend/src/infrastructure/config/env.ts` — edit: three `EnvSchema` keys
- `backend/.env.example` — edit: append the notifications block
- `.env.example` — edit: append two keys
- `backend/src/__tests__/apiRoutes.test.ts` — edit: two env assignments
- `backend/src/modules/notifications/__tests__/NotificationsEnv.test.ts` — new

**Acceptance**

Copied from this task's `acceptance` array in `tasks.json` — identical after the emphasis normalization defined in `agents/blueprint-writer.md` *Acceptance strings*. Each one is decidable by a command below, on this machine, during the build.

1. **WHEN** the env-schema test loads `backend/src/infrastructure/config/env.ts` with `TELEGRAM_BOT_TOKEN=123456:TEST` and neither `APPRISE_URL` nor `TELEGRAM_BOT_USERNAME` set **THE SYSTEM SHALL** expose `config.TELEGRAM_BOT_TOKEN` as `123456:TEST`, `config.APPRISE_URL` as `http://apprise:8000` and `config.TELEGRAM_BOT_USERNAME` as the empty string.
2. **WHEN** the env-schema test loads the module with `TELEGRAM_BOT_TOKEN` set to the empty string **THE SYSTEM SHALL** call `process.exit(1)`.
3. **WHEN** the env-schema test loads the module with `APPRISE_URL=not-a-url` **THE SYSTEM SHALL** call `process.exit(1)`.
4. **WHEN** `(cd backend && npx tsc --noEmit)` runs **THE SYSTEM SHALL** exit 0.
5. **WHEN** `backend/.env.example` and the root `.env.example` are read **THE SYSTEM SHALL** find a line starting `TELEGRAM_BOT_TOKEN=` and a line starting `TELEGRAM_BOT_USERNAME=` in each, plus a line starting `APPRISE_URL=` in `backend/.env.example`.
6. **WHEN** `backend/src/__tests__/apiRoutes.test.ts` is read **THE SYSTEM SHALL** find `process.env.TELEGRAM_BOT_TOKEN = 'test';` among its env assignments.

**Verify** — every command, in order, run from the project root. Each one exits 0 when this task is correct. The last one exiting 0 is what makes the task done.

```bash
(cd backend && npx vitest run src/modules/notifications/__tests__/NotificationsEnv.test.ts)
(cd backend && npx tsc --noEmit)
grep -q '^TELEGRAM_BOT_TOKEN=' backend/.env.example
grep -q '^TELEGRAM_BOT_USERNAME=' backend/.env.example
grep -q '^APPRISE_URL=' backend/.env.example
grep -q '^TELEGRAM_BOT_TOKEN=' .env.example
grep -q '^TELEGRAM_BOT_USERNAME=' .env.example
grep -qF "process.env.TELEGRAM_BOT_TOKEN = 'test';" backend/src/__tests__/apiRoutes.test.ts
```

**Checkpoint**

```bash
git add -A && git commit -m "E1-T1: Add Telegram and Apprise vars to the env schema"
git tag step-01-env-schema
```

Run both after the last `Verify` command exits 0, before starting the next task. If the next task goes wrong, `git reset --hard step-01-env-schema`. The rollback target before this task is `notifications-baseline`.

### `E1-T2` — Wire Telegram variables into docker-compose

**Depends on:** nothing · **Priority:** p0 — metadata for scope cuts, not a running order

In `docker-compose.yml`, in **both** the `backend` and `worker` `environment:` lists, insert these two lines directly after the existing `- APPRISE_URL=http://apprise:8000` line, at the same 6-space indent:

```yaml
      - TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
      - TELEGRAM_BOT_USERNAME=${TELEGRAM_BOT_USERNAME:-}
```

Change no other line. No other service gets them: only `backend` and `worker` run code that reads `config`. Do not run `docker compose`. It needs Docker and the production `.env`, and it is a post-build check.

**Files**
- `docker-compose.yml` — edit: two lines in `backend`, two in `worker`

**Acceptance**

Copied from this task's `acceptance` array in `tasks.json` — identical after the emphasis normalization defined in `agents/blueprint-writer.md` *Acceptance strings*. Each one is decidable by a command below, on this machine, during the build.

1. **WHEN** `docker-compose.yml` is searched for the line `- TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}` **THE SYSTEM SHALL** find exactly 2 occurrences, the `backend` and `worker` services being the only two that carry `APPRISE_URL`.
2. **WHEN** `docker-compose.yml` is searched for the line `- TELEGRAM_BOT_USERNAME=${TELEGRAM_BOT_USERNAME:-}` **THE SYSTEM SHALL** find exactly 2 occurrences.
3. **WHEN** `docker-compose.yml` is searched for `- APPRISE_URL=http://apprise:8000` **THE SYSTEM SHALL** still find exactly 2 occurrences.
4. **WHEN** `git diff -U0 HEAD -- docker-compose.yml` runs **THE SYSTEM SHALL** show zero removed lines.

**Verify** — every command, in order, run from the project root. Each one exits 0 when this task is correct. The last one exiting 0 is what makes the task done.

```bash
test "$(grep -cF -- '- TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}' docker-compose.yml)" -eq 2
test "$(grep -cF -- '- TELEGRAM_BOT_USERNAME=${TELEGRAM_BOT_USERNAME:-}' docker-compose.yml)" -eq 2
test "$(grep -cF -- '- APPRISE_URL=http://apprise:8000' docker-compose.yml)" -eq 2
git rev-parse --verify -q HEAD >/dev/null && test -z "$(git diff -U0 HEAD -- docker-compose.yml | grep -E '^-([^-]|$)')"
```

**Checkpoint**

```bash
git add -A && git commit -m "E1-T2: Wire Telegram variables into docker-compose"
git tag step-02-compose-env
```

Run both after the last `Verify` command exits 0, before starting the next task. Never invent the tag: copy the `checkpoint` field.

### `E1-T3` — Add Telegram link columns to User

**Depends on:** nothing · **Priority:** p0 — metadata for scope cuts, not a running order

In `backend/prisma/schema.prisma`, add these three lines to `model User` directly after `notifySms`, and change no other line:

```prisma
  telegramChatId            String?   @map("telegram_chat_id")
  telegramLinkCode          String?   @unique @map("telegram_link_code")
  telegramLinkCodeExpiresAt DateTime? @map("telegram_link_code_expires_at")
```

Hand-author the migration, following the repo convention (existing directories such as `20260820100000_add_notification_prefs_to_user` do the same):

1. Run `mkdir -p backend/prisma/migrations/20261120000000_add_telegram_notification_fields`.
2. Write `migration.sql` in that directory with exactly:

```sql
-- Additive and nullable only: Telegram linking for the notifications module.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "telegram_chat_id" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "telegram_link_code" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "telegram_link_code_expires_at" TIMESTAMP(3);
CREATE UNIQUE INDEX IF NOT EXISTS "users_telegram_link_code_key" ON "users"("telegram_link_code");
```

`users_telegram_link_code_key` is Prisma's own name for that `@unique`, so schema and database never drift. Keep the comment free of the words the destructive-statement gate searches for.

3. Run `(cd backend && npx prisma generate)`.

Do **not** run `prisma migrate dev`, `migrate deploy`, `db push` or `migrate reset`. Production applies the migration through the existing `migrator` compose service.

**Files**
- `backend/prisma/schema.prisma` — edit: three nullable `User` fields
- `backend/prisma/migrations/20261120000000_add_telegram_notification_fields/migration.sql` — new, hand-authored

**Acceptance**

Copied from this task's `acceptance` array in `tasks.json` — identical after the emphasis normalization defined in `agents/blueprint-writer.md` *Acceptance strings*. Each one is decidable by a command below, on this machine, during the build.

1. **WHEN** `(cd backend && npx prisma generate)` runs **THE SYSTEM SHALL** exit 0 and `backend/node_modules/.prisma/client/index.d.ts` SHALL contain `telegramChatId:`, `telegramLinkCode:` and `telegramLinkCodeExpiresAt:`.
2. **WHEN** the migration file `backend/prisma/migrations/20261120000000_add_telegram_notification_fields/migration.sql` is read **THE SYSTEM SHALL** contain `ADD COLUMN IF NOT EXISTS` statements for `telegram_chat_id` (`TEXT`), `telegram_link_code` (`TEXT`) and `telegram_link_code_expires_at` (`TIMESTAMP(3)`) on `"users"`, and `CREATE UNIQUE INDEX IF NOT EXISTS "users_telegram_link_code_key"`.
3. **WHEN** that migration file is searched case-insensitively for `DROP`, `NOT NULL` or `ALTER COLUMN` **THE SYSTEM SHALL** find no match.
4. **WHEN** `git diff -U0 HEAD -- backend/prisma/schema.prisma` runs **THE SYSTEM SHALL** show zero removed lines, so `telegramUsername`, `notifyEmail`, `notifyTelegram` and `notifySms` are unchanged.
5. **WHEN** `(cd backend && npx vitest run src/modules/identity/__tests__/UpdateProfile.test.ts src/modules/identity/__tests__/CurrentUserResolver.test.ts)` runs **THE SYSTEM SHALL** exit 0, proving the frozen profile-update and user-resolution behaviour is unchanged.
6. **WHEN** `(cd backend && npx tsc --noEmit)` runs **THE SYSTEM SHALL** exit 0.

**Verify** — every command, in order, run from the project root. Each one exits 0 when this task is correct. The last one exiting 0 is what makes the task done.

```bash
(cd backend && npx prisma generate)
grep -q 'telegramChatId:' backend/node_modules/.prisma/client/index.d.ts
grep -q 'telegramLinkCode:' backend/node_modules/.prisma/client/index.d.ts
grep -q 'telegramLinkCodeExpiresAt:' backend/node_modules/.prisma/client/index.d.ts
grep -qF 'ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "telegram_chat_id" TEXT;' backend/prisma/migrations/20261120000000_add_telegram_notification_fields/migration.sql
grep -qF 'ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "telegram_link_code" TEXT;' backend/prisma/migrations/20261120000000_add_telegram_notification_fields/migration.sql
grep -qF 'ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "telegram_link_code_expires_at" TIMESTAMP(3);' backend/prisma/migrations/20261120000000_add_telegram_notification_fields/migration.sql
grep -qF 'CREATE UNIQUE INDEX IF NOT EXISTS "users_telegram_link_code_key" ON "users"("telegram_link_code");' backend/prisma/migrations/20261120000000_add_telegram_notification_fields/migration.sql
status=0; grep -qiE 'DROP|NOT NULL|ALTER COLUMN' backend/prisma/migrations/20261120000000_add_telegram_notification_fields/migration.sql || status=$?; test "$status" -eq 1
git rev-parse --verify -q HEAD >/dev/null && test -z "$(git diff -U0 HEAD -- backend/prisma/schema.prisma | grep -E '^-([^-]|$)')"
(cd backend && npx vitest run src/modules/identity/__tests__/UpdateProfile.test.ts src/modules/identity/__tests__/CurrentUserResolver.test.ts)
(cd backend && npx tsc --noEmit)
```

**Checkpoint**

```bash
git add -A && git commit -m "E1-T3: Add Telegram link columns to User"
git tag step-03-telegram-columns
```

Run both after the last `Verify` command exits 0, before starting the next task.

### `E1-T4` — Define Notifier port, errors and NotifierRegistry

**Depends on:** nothing · **Priority:** p0 — metadata for scope cuts, not a running order

Create the port at `backend/src/modules/notifications/domain/Notifier.ts`, interface only, with a JSDoc note that `recipient` is channel-specific (for Telegram, the chat id):

```ts
export interface Notifier {
  send(recipient: string, message: string, title?: string): Promise<void>;
}
```

Create `backend/src/modules/notifications/domain/errors.ts`:

- `export type NotificationChannelNotLinkedReason = 'TELEGRAM_NOT_LINKED' | 'TELEGRAM_DISABLED';`
- `NotificationChannelNotLinkedError extends Error`:
  - `readonly name = 'NotificationChannelNotLinkedError'`
  - constructor `(readonly reason: NotificationChannelNotLinkedReason)`, calling `super` with these literal messages:
    - `TELEGRAM_NOT_LINKED` → `'Tu cuenta no tiene un chat de Telegram vinculado. Genera un código con POST /api/v1/notifications/telegram/link-code y envíalo al bot como /start <código>.'`
    - `TELEGRAM_DISABLED` → `'Las notificaciones por Telegram están desactivadas. Actívalas con PATCH /api/v1/auth/profile enviando { "notifyTelegram": true }.'`
- `NotificationDeliveryError extends Error`:
  - `readonly name = 'NotificationDeliveryError'`
  - constructor `(message: string, readonly status?: number)`

Create `backend/src/modules/notifications/infrastructure/NotifierRegistry.ts`, a copy of the `IdentityProviderRegistry` shape:

- `private static notifiers = new Map<string, Notifier>()`
- `private static defaultNotifierName = 'apprise'`
- `register(name, notifier)`
- `resolve(name?)`, which throws ``new Error(`Notifier '${targetName}' is not registered.`)``

Write `backend/src/modules/notifications/__tests__/NotifierRegistry.test.ts`:

- Each test calls `vi.resetModules()` and `await import('../infrastructure/NotifierRegistry')`, so the static map is fresh and tests are order-independent.
- Register a stub `{ send: vi.fn() }` as `apprise`, and check both `resolve()` and `resolve('apprise')` with `toBe`.
- `resolve('email')` throws.
- The error-class assertions.

**Files**
- `backend/src/modules/notifications/domain/Notifier.ts` — new
- `backend/src/modules/notifications/domain/errors.ts` — new
- `backend/src/modules/notifications/infrastructure/NotifierRegistry.ts` — new
- `backend/src/modules/notifications/__tests__/NotifierRegistry.test.ts` — new

**Acceptance**

Copied from this task's `acceptance` array in `tasks.json` — identical after the emphasis normalization defined in `agents/blueprint-writer.md` *Acceptance strings*. Each one is decidable by a command below, on this machine, during the build.

1. **WHEN** a notifier is registered as `apprise` and `NotifierRegistry.resolve()` is called with no name **THE SYSTEM SHALL** return that same instance.
2. **WHEN** `NotifierRegistry.resolve('email')` is called and nothing is registered under `email` **THE SYSTEM SHALL** throw `Notifier 'email' is not registered.`
3. **WHEN** `new NotificationChannelNotLinkedError('TELEGRAM_DISABLED')` is constructed **THE SYSTEM SHALL** produce an `Error` instance whose `reason` is `TELEGRAM_DISABLED` and whose `name` is `NotificationChannelNotLinkedError`.
4. **WHEN** `new NotificationDeliveryError('x', 424)` is constructed **THE SYSTEM SHALL** produce an `Error` instance whose `status` is 424.
5. **WHEN** `(cd backend && npx tsc --noEmit)` runs **THE SYSTEM SHALL** exit 0.

**Verify** — every command, in order, run from the project root. Each one exits 0 when this task is correct. The last one exiting 0 is what makes the task done.

```bash
(cd backend && npx vitest run src/modules/notifications/__tests__/NotifierRegistry.test.ts)
(cd backend && npx tsc --noEmit)
```

**Checkpoint**

```bash
git add -A && git commit -m "E1-T4: Define Notifier port, errors and NotifierRegistry"
git tag step-04-notifier-port
```

Run both after the last `Verify` command exits 0, before starting the next task.

### `E1-T5` — Implement AppriseNotifier

**Depends on:** `E1-T4` · **Priority:** p0 — metadata for scope cuts, not a running order

Create `backend/src/modules/notifications/infrastructure/AppriseNotifier.ts`:

- `export interface AppriseNotifierOptions { baseUrl: string; botToken: string; timeoutMs?: number }`
- `export class AppriseNotifier implements Notifier`, with `constructor(private readonly options: AppriseNotifierOptions)`. It does **not** import `config`: the next epic's `routes.ts` passes `config.APPRISE_URL` and `config.TELEGRAM_BOT_TOKEN`.
- `send(recipient, message, title?)`:
  1. If `recipient` does not match `^-?\d+$`, throw `new NotificationDeliveryError('Invalid Telegram chat id')` without calling `fetch`. This stops URL injection into Apprise.
  2. Use the global `fetch` (no import) on `` `${baseUrl.replace(/\/+$/, '')}/notify/` `` with `method: 'POST'`, `headers: { 'Content-Type': 'application/json' }`, `body: JSON.stringify({ urls: \`tgram://${botToken}/${recipient}\`, body: message, title })` and `signal: AbortSignal.timeout(timeoutMs ?? 10000)`.
  3. If `fetch` rejects, throw `new NotificationDeliveryError('Apprise request failed')`.
  4. If `!response.ok`, throw `new NotificationDeliveryError(\`Apprise responded ${response.status}\`, response.status)`.

Keep the trailing slash on `/notify/`: it is the form the Apprise API README documents. **No `logger` or `console` call in this file**, because the URL and the body contain the bot token.

Write `backend/src/modules/notifications/__tests__/AppriseNotifier.test.ts`:

- `vi.stubGlobal('fetch', vi.fn())` in `beforeEach`, `vi.unstubAllGlobals()` in `afterEach`.
- Construct with `{ baseUrl: 'http://apprise.test:8000/', botToken: 'TEST_TOKEN' }`.
- Assert the URL, method and header, and compare `JSON.parse(init.body)` with `toEqual`. Never compare the raw string.
- Cover the four cases below.

**Files**
- `backend/src/modules/notifications/infrastructure/AppriseNotifier.ts` — new
- `backend/src/modules/notifications/__tests__/AppriseNotifier.test.ts` — new

**Acceptance**

Copied from this task's `acceptance` array in `tasks.json` — identical after the emphasis normalization defined in `agents/blueprint-writer.md` *Acceptance strings*. Each one is decidable by a command below, on this machine, during the build.

1. **WHEN** `send('123456789', 'hola', 'Contrata360')` runs against a stubbed `fetch` with base URL `http://apprise.test:8000/` and bot token `TEST_TOKEN` **THE SYSTEM SHALL** POST exactly once to `http://apprise.test:8000/notify/` with header `Content-Type: application/json` and a JSON body equal to `{ "urls": "tgram://TEST_TOKEN/123456789", "body": "hola", "title": "Contrata360" }`.
2. **WHEN** the stubbed Apprise responds with status 424 **THE SYSTEM SHALL** reject with a `NotificationDeliveryError` whose `status` is 424.
3. **WHEN** the stubbed `fetch` rejects with a network error **THE SYSTEM SHALL** reject with a `NotificationDeliveryError` whose message does not contain `TEST_TOKEN`.
4. **WHEN** `send` is called with recipient `12/34` **THE SYSTEM SHALL** reject with a `NotificationDeliveryError` and SHALL NOT call `fetch`.
5. **WHEN** `backend/src/modules/notifications/infrastructure/AppriseNotifier.ts` is searched for `console.` or `logger.` **THE SYSTEM SHALL** find no match.
6. **WHEN** `(cd backend && npx tsc --noEmit)` runs **THE SYSTEM SHALL** exit 0.

**Verify** — every command, in order, run from the project root. Each one exits 0 when this task is correct. The last one exiting 0 is what makes the task done.

```bash
(cd backend && npx vitest run src/modules/notifications/__tests__/AppriseNotifier.test.ts)
status=0; grep -nE 'console\.|logger\.' backend/src/modules/notifications/infrastructure/AppriseNotifier.ts || status=$?; test "$status" -eq 1
(cd backend && npx tsc --noEmit)
```

**Checkpoint**

```bash
git add -A && git commit -m "E1-T5: Implement AppriseNotifier"
git tag step-05-apprise-notifier
```

Run both after the last `Verify` command exits 0, before starting the next task.

---

## Epic acceptance

The epic is done when every task is `done` **and**:

1. **WHEN** `(cd backend && npx vitest run src/modules/notifications)` runs after `E1-T5` **THE SYSTEM SHALL** exit 0 with 0 failed tests across `NotificationsEnv`, `NotifierRegistry` and `AppriseNotifier`.
2. **WHEN** `(cd backend && npx vitest run src/modules/identity/__tests__/UpdateProfile.test.ts src/modules/identity/__tests__/CurrentUserResolver.test.ts)` runs **THE SYSTEM SHALL** exit 0, so the frozen profile behaviour is untouched.

```bash
(cd backend && npx tsc --noEmit)
(cd backend && npx vitest run src/modules/notifications)
(cd backend && npx vitest run src/modules/identity/__tests__/UpdateProfile.test.ts src/modules/identity/__tests__/CurrentUserResolver.test.ts)
```

Run from the project root. Both criteria are decided by these commands. Nothing here waits on a human or an external service.

## Pitfalls

- **Importing `config` into an adapter.** `env.ts` exits the process at import, and the adapter test then dies with "process.exit unexpectedly called". Pass options through the constructor.
- **Running `prisma migrate dev` "to generate the SQL".** It needs a live database and a shadow database, and it may prompt to reset. Write the SQL by hand. It is four lines, given above.
- **A comment in `migration.sql` containing "drop" or "not null".** The destructive-statement gate is case-insensitive, so keep the comment line as written.
- **Comparing the Apprise body as a string.** Key order and spacing are not the contract. Parse it.
- **Editing identity files** to "reuse" something. They are frozen. Copy the registry shape instead.

## Before moving on

- [ ] Every task in this epic is `done` in `tasks.json` — no task left `in_progress`.
- [ ] Every `verify` command of every task in this epic passed, not just the first one.
- [ ] No `verify` command was edited, and none was skipped because a file it names did not exist.
- [ ] **Every task in this epic has its `checkpoint` tag in version control** — `step-01-env-schema` … `step-05-apprise-notifier`, matching `tasks.json`. `for t in step-01-env-schema step-02-compose-env step-03-telegram-columns step-04-notifier-port step-05-apprise-notifier; do git rev-parse -q --verify "refs/tags/$t" >/dev/null; done` exits 0 under `set -e` (a missing tag aborts the loop non-zero).
- [ ] Gate command passes clean, run from the project root.
- [ ] Every "Produced" contract above exists with the stated signature.
- [ ] No file outside the subtree was modified.
- [ ] `.env.example` and `backend/.env.example` updated for the new variables (done in `E1-T1`).
- [ ] One commit per task, each prefixed with its task id, each followed by its checkpoint tag.
