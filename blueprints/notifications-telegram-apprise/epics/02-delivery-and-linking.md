# Epic 02: Delivery and linking — service, gateway, HTTP surface, worker wiring

> After this epic an authenticated user can get a Telegram link code and send a test notification through two `/api/v1/notifications` routes, and the worker long-polls Telegram to bind `/start <code>` messages to accounts, stopping cleanly inside the existing graceful shutdown.

| | |
|---|---|
| **Epic id** | `02-delivery-and-linking` |
| **Tasks** | `E2-T1` … `E2-T7` |
| **Depends on** | `01-foundation` |
| **Unlocks** | nothing — this is the last epic of the change |
| **Parallel with** | nothing |

You do not need any other file to complete this epic. Everything below is repeated here on purpose.

---

## Stack

Express 4 · TypeScript (CommonJS, `module`/`moduleResolution` Node16, target ES2022, `strict`) · no styling (backend only) · Postgres 15 · Prisma 6 · Supabase JWT auth (existing `AuthMiddleware` + `CurrentUserResolver`) · Coolify + docker compose.
Package manager: `npm` (in `backend/`). Runtime: Node 22 (`node:22-alpine`, no `.nvmrc`). Dependency versions are in `backend/package-lock.json` — read it, never guess one. **No new npm dependency**: Node 22's global `fetch` handles both Apprise and Telegram, and `supertest` is already a dev dependency.

All commands run from the **repository root** (the directory with `docker-compose.yml`, `backend/`, `blueprints/`).

| Task | Command |
|---|---|
| Install | `(cd backend && npm ci)` |
| Typecheck | `(cd backend && npx tsc --noEmit)` |
| Lint | NOT CONFIGURED in this repo — there is no lint gate; do not add one |
| Test (one file) | `(cd backend && npx vitest run src/modules/notifications/__tests__/<File>.test.ts)` |
| Test (module) | `(cd backend && npx vitest run src/modules/notifications)` |
| Worker shutdown test | `(cd backend && npx vitest run src/__tests__/workerShutdown.test.ts)` |
| Build | `(cd backend && npm run build)` → `backend/dist/**` |
| Local services | none needed — no task in this epic touches Postgres, Redis, Apprise or the network |

**Gate:** `(cd backend && npx tsc --noEmit)` and the task's own vitest file(s) pass before any task here is marked done.

No task here verifies against a real service. Prisma is a stub, and `fetch` is injected or stubbed.

## Directory subtree

Only the parts this epic touches:

```
backend/src/
  server.ts                                          # exists — you will edit it (E2-T6): import + mount
  worker.ts                                          # exists — you will edit it (E2-T7): start + stop gateway
  __tests__/workerShutdown.test.ts                   # exists — you will edit it (E2-T7)
  infrastructure/config/env.ts                       # exists (edited in epic 01), read-only here
  modules/identity/presentation/AuthMiddleware.ts    # exists, read-only — reused
  modules/identity/presentation/CurrentUserResolver.ts # exists, read-only, FROZEN — reused
  modules/identity/presentation/ValidationMiddleware.ts # exists, read-only — validateRequest
  modules/identity/application/IdentityService.ts    # exists, read-only — reused
  modules/identity/infrastructure/IdentityProviderRegistry.ts # exists, read-only — reused
  modules/procurement/presentation/routes.ts         # exists, read-only — the router pattern to copy
  modules/notifications/
    domain/Notifier.ts                               # exists (epic 01), read-only
    domain/errors.ts                                 # exists (epic 01), read-only
    domain/TelegramLinkCode.ts                       # NEW (E2-T2)
    application/NotificationService.ts               # NEW (E2-T1), edited (E2-T2)
    infrastructure/NotifierRegistry.ts               # exists (epic 01), read-only
    infrastructure/AppriseNotifier.ts                # exists (epic 01), read-only
    infrastructure/TelegramLinkGateway.ts            # NEW (E2-T3), edited (E2-T4)
    presentation/NotificationSchemas.ts              # NEW (E2-T5)
    presentation/NotificationsController.ts          # NEW (E2-T5)
    presentation/routes.ts                           # NEW (E2-T6)
    __tests__/NotificationService.test.ts            # NEW (E2-T1) — send rules
    __tests__/TelegramLinkCode.test.ts               # NEW (E2-T2) — code issuance
    __tests__/TelegramLinkGateway.test.ts            # NEW (E2-T3) — /start matching
    __tests__/TelegramLinkGatewayPolling.test.ts     # NEW (E2-T4) — long-poll loop
    __tests__/NotificationsController.test.ts        # NEW (E2-T5) — HTTP mapping
    __tests__/NotificationsRoutes.test.ts            # NEW (E2-T6) — router through Express
```

Everything outside this subtree is out of scope. **Never edit** `backend/src/modules/identity/**`, `backend/prisma/**` or `docker-compose.yml` in this epic. If a task seems to require it, stop and report.

## Data model touched here

| Entity | Fields this epic adds or reads | Notes |
|---|---|---|
| `User` → table `users` | reads `notifyTelegram`, `telegramChatId`; writes `telegramLinkCode`, `telegramLinkCodeExpiresAt` (issue) and `telegramChatId` + clears both link fields (link) | columns created in epic 01. `telegramLinkCode` is UNIQUE, so a collision is Prisma error `P2002` |

## Contracts

**Consumed** — already exists, do not rebuild:

| From | Interface | Guarantee |
|---|---|---|
| `01-foundation` | `config.APPRISE_URL`, `config.TELEGRAM_BOT_TOKEN`, `config.TELEGRAM_BOT_USERNAME` (from `backend/src/infrastructure/config/env.ts`) | strings. Token non-empty, username `''` when unset, Apprise defaults to `http://apprise:8000`. **Importing `env.ts` exits the process if the environment is invalid**, so only `routes.ts` and `worker.ts` import it |
| `01-foundation` | `Notifier` (`domain/Notifier.ts`) | `send(recipient: string, message: string, title?: string): Promise<void>` |
| `01-foundation` | `NotificationChannelNotLinkedError(reason)`, `NotificationDeliveryError(message, status?)` (`domain/errors.ts`) | `reason` is `'TELEGRAM_NOT_LINKED' \| 'TELEGRAM_DISABLED'`. Both are `instanceof Error` and carry a `name` |
| `01-foundation` | `NotifierRegistry.register(name, notifier)` / `NotifierRegistry.resolve(name?)` | default name `'apprise'`. Throws `Notifier '<name>' is not registered.` |
| `01-foundation` | `new AppriseNotifier({ baseUrl, botToken, timeoutMs? })` | POSTs to `<baseUrl>/notify/`, throws `NotificationDeliveryError` |
| repo | `authMiddleware.handle`, `currentUserResolver.resolve`, `validateRequest(schema)` | 401 `{ error: 'Missing or invalid Authorization header' }` without Bearer. The resolver sets `(req as any).user` or passes through without it. Validation returns 400 `{ error: 'Validation failed', details }` |
| repo | `backend/src/infrastructure/logger.ts` → `logger` | winston `info`/`warn`/`error` |
| repo | `worker.ts` → `gracefulShutdown(signal)` | first `Promise.all` closes 5 workers, then 5 queues, then `redisWorkerClient.quit()`, `prisma.$disconnect()`, `process.exit(0)` |

**Produced** — the API and worker depend on exactly these:

| Export | Signature | Used by |
|---|---|---|
| `application/NotificationService.ts` → `NotificationService` | `constructor(prisma: Pick<PrismaClient, 'user'>, resolveNotifier?: () => Notifier, generateCode?: () => string)` · `sendToUser(userId: string, message: string, title?: string): Promise<void>` · `createTelegramLinkCode(userId: string, now?: Date): Promise<{ code: string; expiresAt: Date }>` | controller, future event jobs |
| `domain/TelegramLinkCode.ts` | `TELEGRAM_LINK_CODE_ALPHABET`, `TELEGRAM_LINK_CODE_LENGTH` (8), `TELEGRAM_LINK_CODE_TTL_MS` (900000), `TELEGRAM_LINK_CODE_PATTERN` (`/^[A-HJ-NP-Z2-9]{8}$/`), `generateTelegramLinkCode(): string` | service, gateway |
| `infrastructure/TelegramLinkGateway.ts` → `TelegramLinkGateway` | `constructor(options: TelegramLinkGatewayOptions)` · `static parseStartCode(text?: string): string \| null` · `handleUpdate(update): Promise<'linked' \| 'ignored'>` · `pollOnce(): Promise<void>` · `start(): void` · `stop(): Promise<void>` | `worker.ts` |
| `presentation/routes.ts` → `notificationsRouter` | Express `Router` with `POST /telegram/link-code`, `POST /test` | `server.ts` at `/api/v1/notifications` |
| `worker.ts` → `telegramLinkGateway` | the single gateway instance | `workerShutdown.test.ts` |

**HTTP contract** (`/api/v1/notifications`, both routes authenticated, 5 requests per minute per IP):

| Route | Success | Errors |
|---|---|---|
| `POST /telegram/link-code` | 200 `{ code, expiresAt (ISO string), botDeepLink ("https://t.me/<username>?start=<code>" or null) }` | 401 · 400 (any body key) · 429 · 500 `{ error: 'Internal Server Error' }` |
| `POST /test` | 200 `{ delivered: true }` | 409 `{ error, code: 'TELEGRAM_NOT_LINKED' \| 'TELEGRAM_DISABLED' }` · 502 `{ error: 'No se pudo entregar la notificación. Inténtalo de nuevo más tarde.', code: 'DELIVERY_FAILED' }` · 401 · 400 · 429 · 500 |

## Conventions that bite in this area

- **Only `presentation/routes.ts` and `src/worker.ts` import `config`.** The service, gateway and controller receive values through constructors, which is what keeps every test hermetic.
- **Resolve the notifier at call time** (`() => NotifierRegistry.resolve()`), never at module load.
- **`notificationsRouter` must be imported in `server.ts` after `authRouter`.** `routes.ts` calls `IdentityProviderRegistry.resolve()` at load, and the `supabase` provider is registered by identity's `routes.ts`.
- **One `getUpdates` consumer per bot token.** The gateway runs only in `worker.ts`, never in the API process.
- **Never log** the bot token, a link code, a chat id, or any outbound URL/body. Log `userId`, HTTP status and `error.message` only.
- **vitest 4:** a mocked class used with `new` must be a `class` in the factory, not `vi.fn().mockImplementation(() => …)`. Factories are hoisted, so use `vi.hoisted` for shared counters.
- **`vi.clearAllMocks()` clears call history, including calls made at import time.** Count import-time calls through a hoisted counter.
- **User-facing strings are Spanish, exactly as written here.** Tests assert on `code` and status, never on the Spanish text.

Full project rules: `CLAUDE.md`. Area rules: `.claude/rules/notifications-module.md`, `.claude/rules/backend-tests.md`. Both sit in the repo root: the builder copied them there from the bundle's `workspace/` before task one, with `rsync -a --ignore-existing blueprints/notifications-telegram-apprise/workspace/ ./`.

---

## Tasks

Listed in the same order as `tasks.json`. That order is the build order — work top to bottom and do not re-rank by priority or by what looks quick.

### `E2-T1` — Implement NotificationService.sendToUser

**Depends on:** `E1-T3`, `E1-T4` · **Priority:** p0 — metadata for scope cuts, not a running order

Create `backend/src/modules/notifications/application/NotificationService.ts`:

- `import type { PrismaClient } from '@prisma/client'`.
- `export class NotificationService` with `constructor(private readonly prisma: Pick<PrismaClient, 'user'>, private readonly resolveNotifier: () => Notifier = () => NotifierRegistry.resolve())`.
- `sendToUser(userId, message, title?)`:
  1. `findUnique({ where: { id: userId }, select: { notifyTelegram: true, telegramChatId: true } })`.
  2. If there is no row, or `telegramChatId` is falsy, throw `new NotificationChannelNotLinkedError('TELEGRAM_NOT_LINKED')`.
  3. Else if `!notifyTelegram`, throw `new NotificationChannelNotLinkedError('TELEGRAM_DISABLED')`.
  4. Else `await this.resolveNotifier().send(user.telegramChatId, message, title)`. Errors propagate unchanged.

The not-linked check comes first because linking is what the user must do before the toggle matters.

Write `backend/src/modules/notifications/__tests__/NotificationService.test.ts`, following `identity/__tests__/IdentityService.test.ts`:

- `const prisma = { user: { findUnique: vi.fn() } } as any`.
- The notifier stub is `{ send: vi.fn() }`, passed as `() => notifier`.
- Assert refusals with `rejects.toBeInstanceOf(NotificationChannelNotLinkedError)` plus `rejects.toMatchObject({ reason })`.

**Files**
- `backend/src/modules/notifications/application/NotificationService.ts` — new
- `backend/src/modules/notifications/__tests__/NotificationService.test.ts` — new

**Acceptance**

Copied from this task's `acceptance` array in `tasks.json` — identical after the emphasis normalization defined in `agents/blueprint-writer.md` *Acceptance strings*. Each one is decidable by a command below, on this machine, during the build.

1. **WHEN** `sendToUser('user-1', 'hola', 'Contrata360')` runs for a user with `notifyTelegram: true` and `telegramChatId: '123456789'` **THE SYSTEM SHALL** call the resolved notifier's `send` exactly once with `'123456789'`, `'hola'` and `'Contrata360'`.
2. **WHEN** the user has `telegramChatId: null` **THE SYSTEM SHALL** reject with `NotificationChannelNotLinkedError` whose `reason` is `TELEGRAM_NOT_LINKED` and SHALL NOT call `send`.
3. **WHEN** the user has `telegramChatId: '123456789'` and `notifyTelegram: false` **THE SYSTEM SHALL** reject with `NotificationChannelNotLinkedError` whose `reason` is `TELEGRAM_DISABLED` and SHALL NOT call `send`.
4. **WHEN** no user row exists for the id **THE SYSTEM SHALL** reject with `NotificationChannelNotLinkedError` whose `reason` is `TELEGRAM_NOT_LINKED`.
5. **WHEN** the notifier's `send` rejects with a `NotificationDeliveryError` **THE SYSTEM SHALL** reject with that same error instance.
6. **WHEN** `(cd backend && npx tsc --noEmit)` runs **THE SYSTEM SHALL** exit 0.

**Verify** — every command, in order, run from the project root. Each one exits 0 when this task is correct. The last one exiting 0 is what makes the task done.

```bash
(cd backend && npx vitest run src/modules/notifications/__tests__/NotificationService.test.ts)
(cd backend && npx tsc --noEmit)
```

**Checkpoint**

```bash
git add -A && git commit -m "E2-T1: Implement NotificationService.sendToUser"
git tag step-06-notification-service
```

Run both after the last `Verify` command exits 0, before starting the next task. If the next task goes wrong, `git reset --hard step-06-notification-service`.

### `E2-T2` — Add Telegram link-code issuance

**Depends on:** `E2-T1` · **Priority:** p0 — metadata for scope cuts, not a running order

Create `backend/src/modules/notifications/domain/TelegramLinkCode.ts`:

```ts
export const TELEGRAM_LINK_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const TELEGRAM_LINK_CODE_LENGTH = 8;
export const TELEGRAM_LINK_CODE_TTL_MS = 15 * 60 * 1000;
export const TELEGRAM_LINK_CODE_PATTERN = /^[A-HJ-NP-Z2-9]{8}$/;
```

Also export `generateTelegramLinkCode()`, which picks each of the 8 characters with `randomInt(0, TELEGRAM_LINK_CODE_ALPHABET.length)` from `node:crypto`.

Edit `NotificationService.ts`:

- Add an optional third constructor parameter `generateCode: () => string = generateTelegramLinkCode`.
- Add `createTelegramLinkCode(userId, now = new Date())`:
  1. `expiresAt = new Date(now.getTime() + TELEGRAM_LINK_CODE_TTL_MS)`.
  2. Up to 3 attempts, each running `this.prisma.user.update({ where: { id: userId }, data: { telegramLinkCode: code, telegramLinkCodeExpiresAt: expiresAt } })` and returning `{ code, expiresAt }` on success.
  3. Catch as `catch (error: any)` (the repo's convention, as in `backend/src/worker.ts`). Retry only on `error?.code === 'P2002'`. Rethrow anything else at once.
  4. After 3 collisions, throw `new Error('Could not allocate a unique Telegram link code')`.

Write `backend/src/modules/notifications/__tests__/TelegramLinkCode.test.ts`:

- Simulate Prisma errors with `Object.assign(new Error('x'), { code: 'P2002' })`.
- For the timestamp, assert `data.telegramLinkCodeExpiresAt.toISOString() === '2026-11-20T10:15:00.000Z'`.

**Files**
- `backend/src/modules/notifications/domain/TelegramLinkCode.ts` — new
- `backend/src/modules/notifications/application/NotificationService.ts` — edit: add `createTelegramLinkCode` and the `generateCode` parameter
- `backend/src/modules/notifications/__tests__/TelegramLinkCode.test.ts` — new

**Acceptance**

Copied from this task's `acceptance` array in `tasks.json` — identical after the emphasis normalization defined in `agents/blueprint-writer.md` *Acceptance strings*. Each one is decidable by a command below, on this machine, during the build.

1. **WHEN** `generateTelegramLinkCode()` is called 1000 times **THE SYSTEM SHALL** return only strings matching `^[A-HJ-NP-Z2-9]{8}$`.
2. **WHEN** `createTelegramLinkCode('user-1', new Date('2026-11-20T10:00:00.000Z'))` runs **THE SYSTEM SHALL** call `prisma.user.update` with `where: { id: 'user-1' }`, `telegramLinkCode` equal to the returned code, and `telegramLinkCodeExpiresAt` equal to `2026-11-20T10:15:00.000Z`.
3. **WHEN** the first `prisma.user.update` rejects with an error whose `code` is `P2002` **THE SYSTEM SHALL** retry with a new code and resolve on the second attempt.
4. **WHEN** `prisma.user.update` rejects with `P2002` on all 3 attempts **THE SYSTEM SHALL** reject with the message `Could not allocate a unique Telegram link code`.
5. **WHEN** `prisma.user.update` rejects with an error whose `code` is `P2025` **THE SYSTEM SHALL** reject with that error after exactly 1 call.
6. **WHEN** `(cd backend && npx vitest run src/modules/notifications/__tests__/NotificationService.test.ts)` and `(cd backend && npx tsc --noEmit)` run **THE SYSTEM SHALL** exit 0 for both.

**Verify** — every command, in order, run from the project root. Each one exits 0 when this task is correct. The last one exiting 0 is what makes the task done.

```bash
(cd backend && npx vitest run src/modules/notifications/__tests__/TelegramLinkCode.test.ts)
(cd backend && npx vitest run src/modules/notifications/__tests__/NotificationService.test.ts)
(cd backend && npx tsc --noEmit)
```

**Checkpoint**

```bash
git add -A && git commit -m "E2-T2: Add Telegram link-code issuance"
git tag step-07-telegram-link-code
```

Run both after the last `Verify` command exits 0, before starting the next task.

### `E2-T3` — Match /start codes in TelegramLinkGateway

**Depends on:** `E1-T3`, `E2-T2` · **Priority:** p0 — metadata for scope cuts, not a running order

Create `backend/src/modules/notifications/infrastructure/TelegramLinkGateway.ts`. It is not a `Notifier`.

- Export `TelegramUpdate { update_id: number; message?: { text?: string; chat: { id: number } } }`.
- Export `TelegramLinkGatewayOptions` with these fields:
  - `prisma: Pick<PrismaClient, 'user'>`
  - `botToken: string`
  - `fetchImpl?: typeof fetch`
  - `logger?` (default: the repo `logger`)
  - `pollTimeoutSeconds?` (default `25`)
  - `errorBackoffMs?` (default `5000`)
  - `now?: () => Date` (default `() => new Date()`)
- `static parseStartCode(text)`: match `^\/start(?:@\w+)?\s+(\S+)\s*$`, upper-case the group, and return it only if it matches `TELEGRAM_LINK_CODE_PATTERN`. Otherwise return `null`.
- `handleUpdate(update)`:
  1. No message, or no parsed code → `'ignored'`, with no query.
  2. `findUnique({ where: { telegramLinkCode: code }, select: { id: true, telegramLinkCodeExpiresAt: true } })`.
  3. If there is no user, or `expiresAt` is missing, or `expiresAt <= now()` → log `info('Telegram link code ignored', { reason: 'unknown' | 'expired' })` and return `'ignored'`.
  4. Otherwise run `update({ where: { id }, data: { telegramChatId: String(chat.id), telegramLinkCode: null, telegramLinkCodeExpiresAt: null } })`, log `info('Telegram account linked', { userId })`, and return `'linked'`.
- Never log the code or the chat id. Do not import `config`.

Write `backend/src/modules/notifications/__tests__/TelegramLinkGateway.test.ts`:

- `vi.mock('../../../infrastructure/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }))`.
- A prisma stub with `findUnique` and `update`.
- `now: () => new Date('2026-11-20T10:00:00.000Z')`.

**Files**
- `backend/src/modules/notifications/infrastructure/TelegramLinkGateway.ts` — new
- `backend/src/modules/notifications/__tests__/TelegramLinkGateway.test.ts` — new

**Acceptance**

Copied from this task's `acceptance` array in `tasks.json` — identical after the emphasis normalization defined in `agents/blueprint-writer.md` *Acceptance strings*. Each one is decidable by a command below, on this machine, during the build.

1. **WHEN** `handleUpdate` receives `{ update_id: 1, message: { text: '/start ABCD2345', chat: { id: 123456789 } } }` and that code belongs to user `user-1` with an expiry after now **THE SYSTEM SHALL** call `prisma.user.update` with `where: { id: 'user-1' }` and data `{ telegramChatId: '123456789', telegramLinkCode: null, telegramLinkCodeExpiresAt: null }` and resolve `linked`.
2. **WHEN** the matching user's `telegramLinkCodeExpiresAt` is earlier than or equal to now **THE SYSTEM SHALL** resolve `ignored` and SHALL NOT call `prisma.user.update`.
3. **WHEN** no user holds the code **THE SYSTEM SHALL** resolve `ignored` and SHALL NOT call `prisma.user.update`.
4. **WHEN** the message text is `hola` or the update has no `message` **THE SYSTEM SHALL** resolve `ignored` without calling `prisma.user.findUnique`.
5. **WHEN** `TelegramLinkGateway.parseStartCode('/start@ContrataBot abcd2345')` runs **THE SYSTEM SHALL** return `ABCD2345`, and WHEN it runs on `/start ABC` THE SYSTEM SHALL return `null`.
6. **WHEN** `(cd backend && npx tsc --noEmit)` runs **THE SYSTEM SHALL** exit 0.

**Verify** — every command, in order, run from the project root. Each one exits 0 when this task is correct. The last one exiting 0 is what makes the task done.

```bash
(cd backend && npx vitest run src/modules/notifications/__tests__/TelegramLinkGateway.test.ts)
(cd backend && npx tsc --noEmit)
```

**Checkpoint**

```bash
git add -A && git commit -m "E2-T3: Match /start codes in TelegramLinkGateway"
git tag step-08-link-gateway-matching
```

Run both after the last `Verify` command exits 0, before starting the next task.

### `E2-T4` — Add the getUpdates long-poll loop

**Depends on:** `E2-T3` · **Priority:** p0 — metadata for scope cuts, not a running order

Extend `TelegramLinkGateway.ts`:

- **State:** `offset = 0`, a `running` flag, an `AbortController` for the current run, and the loop promise.
- **`pollOnce()`:**
  1. Fetch `https://api.telegram.org/bot${botToken}/getUpdates?` + `new URLSearchParams({ offset: String(offset), timeout: String(pollTimeoutSeconds), allowed_updates: '["message"]' })` through `fetchImpl(url, { signal })`, where `signal` is the one `stop()` aborts.
  2. On `!response.ok`, throw `new Error(\`Telegram getUpdates responded ${response.status}\`)`. Never put the URL or the token in the message.
  3. Parse `{ ok, result }`. If `ok !== true`, throw `new Error('Telegram getUpdates returned ok=false')`.
  4. For each update, in order: `try { await this.handleUpdate(u) } catch (e: any) { logger.error('Telegram update handling failed', { updateId: u.update_id, error: e?.message }) }`, then `offset = u.update_id + 1`.
- **`start()`:** a no-op if already running. Otherwise set `running = true`, create a new `AbortController`, and launch the private `loop()` without awaiting it.
- **`loop()`:** while running, `await pollOnce()`. On error, caught as `catch (e: any)` (the repo's convention, as in `backend/src/worker.ts`): if not running (aborted by stop), exit. Otherwise log `warn('Telegram getUpdates failed', { error: e?.message })` and sleep `errorBackoffMs`, with a sleep that resolves early on abort.
- **`stop()`:** `running = false`, abort, await the loop promise. Calling it twice is safe.
- **Defaults:** `fetchImpl` is the global `fetch`. The default poll timeout of 25 seconds stays below the worker's 30-second shutdown timeout, and `stop()` aborts the request rather than waiting it out.

Write `backend/src/modules/notifications/__tests__/TelegramLinkGatewayPolling.test.ts`:

- Logger mocked.
- `botToken: 'TEST_TOKEN'`.
- `fetchImpl = vi.fn()` returning `new Response(JSON.stringify(body), { status })`, or, for the stop case, a promise that rejects when `init.signal` aborts.
- Parse called URLs with `new URL(...)` and check `pathname` and `searchParams`.
- `vi.spyOn(gateway, 'handleUpdate')` for the batch and poison cases.
- `vi.waitFor(...)` plus `errorBackoffMs: 1` for the loop cases.

**Files**
- `backend/src/modules/notifications/infrastructure/TelegramLinkGateway.ts` — edit: polling members
- `backend/src/modules/notifications/__tests__/TelegramLinkGatewayPolling.test.ts` — new

**Acceptance**

Copied from this task's `acceptance` array in `tasks.json` — identical after the emphasis normalization defined in `agents/blueprint-writer.md` *Acceptance strings*. Each one is decidable by a command below, on this machine, during the build.

1. **WHEN** `pollOnce()` runs for the first time **THE SYSTEM SHALL** request path `/botTEST_TOKEN/getUpdates` on `api.telegram.org` with query parameters `offset=0`, `timeout=25` and `allowed_updates=["message"]`.
2. **WHEN** that response is `{ "ok": true, "result": [...] }` holding updates with `update_id` 41 and 42 **THE SYSTEM SHALL** pass both to `handleUpdate` in order, and the next `pollOnce()` SHALL request `offset=43`.
3. **WHEN** `getUpdates` responds with HTTP 409 **THE SYSTEM SHALL** reject `pollOnce()` with an error whose message contains `409` and does not contain `TEST_TOKEN`, and SHALL NOT call `handleUpdate`.
4. **WHEN** `handleUpdate` throws for update 41 in a batch of 41 and 42 **THE SYSTEM SHALL** still call `handleUpdate` for 42 and the next request SHALL use `offset=43`.
5. **WHEN** `start()` is called and `stop()` is then called while a long-poll request is in flight **THE SYSTEM SHALL** abort that request's `AbortSignal` and `stop()` SHALL resolve.
6. **WHEN** the first poll after `start()` fails and `errorBackoffMs` is 1 **THE SYSTEM SHALL** issue a second `getUpdates` request after the backoff.

**Verify** — every command, in order, run from the project root. Each one exits 0 when this task is correct. The last one exiting 0 is what makes the task done.

```bash
(cd backend && npx vitest run src/modules/notifications/__tests__/TelegramLinkGatewayPolling.test.ts)
(cd backend && npx vitest run src/modules/notifications/__tests__/TelegramLinkGateway.test.ts)
(cd backend && npx tsc --noEmit)
```

**Checkpoint**

```bash
git add -A && git commit -m "E2-T4: Add the getUpdates long-poll loop"
git tag step-09-link-gateway-polling
```

Run both after the last `Verify` command exits 0, before starting the next task.

### `E2-T5` — Add notifications controller and schemas

**Depends on:** `E2-T2` · **Priority:** p0 — metadata for scope cuts, not a running order

Create `backend/src/modules/notifications/presentation/NotificationSchemas.ts`, containing `import { z } from 'zod';` and `export const EmptyBodySchema = z.strictObject({});`.

Create `backend/src/modules/notifications/presentation/NotificationsController.ts`.

Exports:

- `TEST_NOTIFICATION_TITLE = 'Contrata360'`
- `TEST_NOTIFICATION_MESSAGE = 'Notificación de prueba: tu cuenta de Telegram está vinculada correctamente con Contrata360.'`
- `class NotificationsController`, constructed with `(notificationService: NotificationService, options: { botUsername: string })`. No `config` import.

`createTelegramLinkCode(req, res)`:

1. If there is no `(req as any).user`, respond 401 `{ error: 'Unauthorized' }`.
2. Otherwise call the service and respond 200 `{ code, expiresAt: expiresAt.toISOString(), botDeepLink }`, where `botDeepLink` is `botUsername ? \`https://t.me/${botUsername}?start=${code}\` : null`.
3. On error, caught as `catch (error: any)`, `logger.error('Notifications endpoint error', { error: error?.message })` and respond 500 `{ error: 'Internal Server Error' }`.

`sendTest(req, res)`:

1. Respond 401 if there is no user.
2. Otherwise `sendToUser(user.id, TEST_NOTIFICATION_MESSAGE, TEST_NOTIFICATION_TITLE)`, then respond 200 `{ delivered: true }`.
3. `NotificationChannelNotLinkedError` → 409 `{ error: err.message, code: err.reason }`.
4. `NotificationDeliveryError` → `logger.warn('Notification delivery failed', { userId: user.id, status: err.status })` and 502 `{ error: 'No se pudo entregar la notificación. Inténtalo de nuevo más tarde.', code: 'DELIVERY_FAILED' }`.
5. Anything else → log and respond 500 `{ error: 'Internal Server Error' }`.

Write `backend/src/modules/notifications/__tests__/NotificationsController.test.ts`:

- Fake `req`/`res` (`status: vi.fn().mockReturnThis()`, `json: vi.fn().mockReturnThis()`), exactly as `identity/__tests__/UpdateProfile.test.ts` does.
- Service stub `{ createTelegramLinkCode: vi.fn(), sendToUser: vi.fn() }`, and the logger mocked.

**Files**
- `backend/src/modules/notifications/presentation/NotificationSchemas.ts` — new
- `backend/src/modules/notifications/presentation/NotificationsController.ts` — new
- `backend/src/modules/notifications/__tests__/NotificationsController.test.ts` — new

**Acceptance**

Copied from this task's `acceptance` array in `tasks.json` — identical after the emphasis normalization defined in `agents/blueprint-writer.md` *Acceptance strings*. Each one is decidable by a command below, on this machine, during the build.

1. **WHEN** `createTelegramLinkCode` runs with no `req.user` **THE SYSTEM SHALL** respond 401 with `{ error: 'Unauthorized' }` and SHALL NOT call the service.
2. **WHEN** `createTelegramLinkCode` runs for user `user-1`, the service returns code `ABCD2345` expiring at `2026-11-20T10:15:00.000Z`, and the bot username is `ContrataTestBot` **THE SYSTEM SHALL** respond 200 with `{ code: 'ABCD2345', expiresAt: '2026-11-20T10:15:00.000Z', botDeepLink: 'https://t.me/ContrataTestBot?start=ABCD2345' }`.
3. **WHEN** the bot username is the empty string **THE SYSTEM SHALL** respond 200 with `botDeepLink` equal to `null`.
4. **WHEN** `sendTest` runs and the service rejects with `NotificationChannelNotLinkedError('TELEGRAM_NOT_LINKED')` **THE SYSTEM SHALL** respond 409 with a JSON body whose `code` is `TELEGRAM_NOT_LINKED` and whose `error` is a non-empty string.
5. **WHEN** `sendTest` runs and the service rejects with a `NotificationDeliveryError` **THE SYSTEM SHALL** respond 502 with `code` equal to `DELIVERY_FAILED`.
6. **WHEN** `sendTest` runs and the service resolves **THE SYSTEM SHALL** call `sendToUser` with `user-1`, `TEST_NOTIFICATION_MESSAGE` and `TEST_NOTIFICATION_TITLE` and respond 200 with `{ delivered: true }`.

**Verify** — every command, in order, run from the project root. Each one exits 0 when this task is correct. The last one exiting 0 is what makes the task done.

```bash
(cd backend && npx vitest run src/modules/notifications/__tests__/NotificationsController.test.ts)
(cd backend && npx tsc --noEmit)
```

**Checkpoint**

```bash
git add -A && git commit -m "E2-T5: Add notifications controller and schemas"
git tag step-10-notifications-controller
```

Run both after the last `Verify` command exits 0, before starting the next task.

### `E2-T6` — Mount the notifications router

**Depends on:** `E1-T1`, `E1-T5`, `E2-T5` · **Priority:** p0 — metadata for scope cuts, not a running order

Create `backend/src/modules/notifications/presentation/routes.ts`, shaped like `procurement/presentation/routes.ts`. Wire it in this order:

1. `NotifierRegistry.register('apprise', new AppriseNotifier({ baseUrl: config.APPRISE_URL, botToken: config.TELEGRAM_BOT_TOKEN }))`
2. `new NotificationService(prisma)`
3. `new NotificationsController(service, { botUsername: config.TELEGRAM_BOT_USERNAME })`
4. `new IdentityService(IdentityProviderRegistry.resolve())`, `new AuthMiddleware(jwtValidator)` and `new CurrentUserResolver(identityService)`

The limiter, with `message` as the response body:

```ts
rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  store: new FallbackRedisStore(redisAppClient, 'rl:notifications:'),
  message: { error: 'Too many notification requests, please try again in a minute.' },
})
```

Routes, each with the chain `authMiddleware.handle, currentUserResolver.resolve, notificationsLimiter, validateRequest(EmptyBodySchema)` before the handler:

- `POST '/telegram/link-code'` → `createTelegramLinkCode`
- `POST '/test'` → `sendTest`

Finish with `export { notificationsRouter };`.

Import paths:

| Name | Path |
|---|---|
| `config` | `'../../../infrastructure/config/env'` |
| `prisma` | `'../../../infrastructure/db/prisma'` |
| `jwtValidator` | `'../../../infrastructure/security/jwtValidator'` |
| `FallbackRedisStore` | `'../../../infrastructure/security/rateLimitStore'` |
| `redisAppClient` | `'../../../infrastructure/redis/redisAppClient'` |
| `AuthMiddleware`, `CurrentUserResolver`, `validateRequest` | `'../../identity/presentation/…'` |
| `IdentityService` | `'../../identity/application/IdentityService'` |
| `IdentityProviderRegistry` | `'../../identity/infrastructure/IdentityProviderRegistry'` |

Edit `backend/src/server.ts`:

- After the `analyticsRouter` import, add `import { notificationsRouter } from './modules/notifications/presentation/routes';`. It must come **after** `authRouter`.
- After the analytics mount, add `app.use(\`${API_PREFIX}/notifications\`, notificationsRouter);`.
- Nothing else changes.

Write `backend/src/modules/notifications/__tests__/NotificationsRoutes.test.ts`. Build a fresh `express()` with `express.json()` and mount the router at `/api/v1/notifications`. Use `supertest` for the 4 HTTP criteria. Mock these modules with self-contained factories:

- `../../../infrastructure/config/env` → `{ config: { APPRISE_URL: 'http://apprise.test:8000', TELEGRAM_BOT_TOKEN: 'TEST_TOKEN', TELEGRAM_BOT_USERNAME: 'ContrataTestBot' } }`
- `../../../infrastructure/security/jwtValidator` → `{ jwtValidator: { verify: vi.fn(async () => ({ sub: '00000000-0000-0000-0000-000000000001' })) } }`
- `../../../infrastructure/db/prisma` → `user.upsert` resolving a row with `plan: null`, `user.update` resolving `{}`, `user.findUnique`, and `plan.findUnique` resolving `null`
- `../../../infrastructure/redis/redisAppClient` → `{ redisAppClient: {} }`
- `../../../infrastructure/security/rateLimitStore` → `{ FallbackRedisStore: class {} }`
- `express-rate-limit` → `{ default: () => (_req: any, _res: any, next: any) => next() }`
- `../../identity/infrastructure/IdentityProviderRegistry` → `{ IdentityProviderRegistry: { resolve: () => ({ getUser: async () => ({ id: '00000000-0000-0000-0000-000000000001', email: 'user@test.com', roles: ['USER'], permissions: [] }) }) } }`

Then run `(cd backend && npm run build)` and the gates below.

**Files**
- `backend/src/modules/notifications/presentation/routes.ts` — new
- `backend/src/server.ts` — edit: one import, one mount
- `backend/src/modules/notifications/__tests__/NotificationsRoutes.test.ts` — new

**Acceptance**

Copied from this task's `acceptance` array in `tasks.json` — identical after the emphasis normalization defined in `agents/blueprint-writer.md` *Acceptance strings*. Each one is decidable by a command below, on this machine, during the build.

1. **WHEN** `POST /api/v1/notifications/telegram/link-code` is sent with no `Authorization` header to an Express app mounting `notificationsRouter` **THE SYSTEM SHALL** respond 401.
2. **WHEN** `POST /api/v1/notifications/test` is sent with no `Authorization` header **THE SYSTEM SHALL** respond 401.
3. **WHEN** `POST /api/v1/notifications/telegram/link-code` is sent with `Authorization: Bearer test-token` for a resolvable user **THE SYSTEM SHALL** respond 200 with a `code` matching `^[A-HJ-NP-Z2-9]{8}$` and a `botDeepLink` equal to `https://t.me/ContrataTestBot?start=` followed by that code.
4. **WHEN** `POST /api/v1/notifications/test` is sent with `Authorization: Bearer test-token` and body `{ "extra": 1 }` **THE SYSTEM SHALL** respond 400.
5. **WHEN** `backend/src/server.ts` is searched **THE SYSTEM SHALL** find the notifications mount line built from `API_PREFIX` and `notificationsRouter`, the `notificationsRouter` import on a later line than the `authRouter` import, and the existing `auth`, `procurement` and `analytics` mount lines unchanged.
6. **WHEN** `(cd backend && npm run build)` runs **THE SYSTEM SHALL** exit 0, emit `backend/dist/modules/notifications/presentation/routes.js`, and the built `AppriseNotifier.js` SHALL load with `require` and exit 0.

**Verify** — every command, in order, run from the project root. Each one exits 0 when this task is correct. The last one exiting 0 is what makes the task done.

```bash
(cd backend && npx vitest run src/modules/notifications/__tests__/NotificationsRoutes.test.ts)
grep -qF 'app.use(`${API_PREFIX}/notifications`, notificationsRouter);' backend/src/server.ts
grep -qF 'app.use(`${API_PREFIX}/auth`, authRouter);' backend/src/server.ts
grep -qF 'app.use(`${API_PREFIX}/procurement`, procurementRouter);' backend/src/server.ts
grep -qF 'app.use(`${API_PREFIX}/analytics`, analyticsRouter);' backend/src/server.ts
test "$(grep -n "from './modules/notifications/presentation/routes'" backend/src/server.ts | cut -d: -f1)" -gt "$(grep -n "from './modules/identity/presentation/routes'" backend/src/server.ts | cut -d: -f1)"
(cd backend && npx tsc --noEmit)
(cd backend && npm run build)
test -f backend/dist/modules/notifications/presentation/routes.js
(cd backend && node -e "require('./dist/modules/notifications/infrastructure/AppriseNotifier.js')")
```

**Checkpoint**

```bash
git add -A && git commit -m "E2-T6: Mount the notifications router"
git tag step-11-notifications-routes
```

Run both after the last `Verify` command exits 0, before starting the next task. `dist/` is gitignored, so the build output is never committed.

### `E2-T7` — Run the link gateway in the worker

**Depends on:** `E1-T1`, `E2-T4` · **Priority:** p0 — metadata for scope cuts, not a running order

Edit `backend/src/worker.ts`:

- Change line 1 to `import { config } from './infrastructure/config/env';`. The side effect is the same.
- Import `TelegramLinkGateway` from `'./modules/notifications/infrastructure/TelegramLinkGateway'`.
- Add `export const telegramLinkGateway = new TelegramLinkGateway({ prisma, botToken: config.TELEGRAM_BOT_TOKEN });`.
- In `gracefulShutdown`, add `telegramLinkGateway.stop(),` as the last element of the **first** `Promise.all`, the one closing `datasetImportWorker` … `entitiesWorker`. Leave everything else in the function as it is.
- At the bottom, after the `setupRecurringJobs().catch(…)` block, add `telegramLinkGateway.start();` and `logger.info('Telegram link gateway started (long polling)');`.

Edit `backend/src/__tests__/workerShutdown.test.ts`. Keep every existing mock and assertion, and add:

- `const gatewayState = vi.hoisted(() => ({ constructCalls: 0, startCalls: 0 }));`
- `vi.mock('../infrastructure/config/env', () => ({ config: { TELEGRAM_BOT_TOKEN: 'TEST_TOKEN' } }));`. This also makes the file independent of the shell environment.
- `vi.mock('../modules/notifications/infrastructure/TelegramLinkGateway', () => ({ TelegramLinkGateway: class { constructor() { gatewayState.constructCalls += 1; } start = vi.fn(() => { gatewayState.startCalls += 1; }); stop = vi.fn().mockResolvedValue(undefined); } }));`. It must be a `class`.
- Import `telegramLinkGateway` from `'../worker'`.
- A test asserting `gatewayState.constructCalls === 1` and `gatewayState.startCalls === 1`.
- In the **existing** shutdown test, directly after its existing `await gracefulShutdown('SIGTERM');` line, add `expect(telegramLinkGateway.stop).toHaveBeenCalled();` and `expect(vi.mocked(telegramLinkGateway.stop).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(prisma.$disconnect).mock.invocationCallOrder[0]);`. Do **not** add a separate `it()` block for the order: `worker.ts`'s `isShuttingDown` guard makes a second `gracefulShutdown('SIGTERM')` a no-op, and `beforeEach` runs `vi.clearAllMocks()`, so a separate test sees no calls. The test's 12 existing call assertions (5 worker `close()`, 5 queue `close()`, `redisWorkerClient.quit()`, `prisma.$disconnect()`) and its `toHaveBeenCalledWith(0)` exit assertion stay unchanged.

**Files**
- `backend/src/worker.ts` — edit: config binding, gateway instance, `stop()` in the first `Promise.all`, `start()` at boot
- `backend/src/__tests__/workerShutdown.test.ts` — edit: env and gateway mocks, one new start-count test, two assertions added inside the existing shutdown test

**Acceptance**

Copied from this task's `acceptance` array in `tasks.json` — identical after the emphasis normalization defined in `agents/blueprint-writer.md` *Acceptance strings*. Each one is decidable by a command below, on this machine, during the build.

1. **WHEN** `backend/src/worker.ts` is imported by the worker-shutdown test **THE SYSTEM SHALL** construct one `TelegramLinkGateway` and call its `start()` exactly once.
2. **WHEN** `gracefulShutdown('SIGTERM')` runs **THE SYSTEM SHALL** call `telegramLinkGateway.stop()` together with the 5 BullMQ worker `close()` calls and exit with code 0.
3. **WHEN** the existing shutdown test's single `await gracefulShutdown('SIGTERM')` call completes **THE SYSTEM SHALL** show, asserted inside that same test with no separate `it()` block, a `telegramLinkGateway.stop` `invocationCallOrder[0]` lower than the `prisma.$disconnect` `invocationCallOrder[0]`.
4. **WHEN** the worker-shutdown test runs **THE SYSTEM SHALL** still pass all 12 pre-existing call assertions in the existing shutdown test: 5 worker `close()`, 5 queue `close()`, `redisWorkerClient.quit()` and `prisma.$disconnect()`.
5. **WHEN** `(cd backend && npm run build)` runs **THE SYSTEM SHALL** exit 0, `backend/dist/worker.js` SHALL reference `TelegramLinkGateway`, and the built `TelegramLinkGateway.js` SHALL load with `require` and exit 0.
6. **WHEN** `(cd backend && npx vitest run src/modules/notifications)` runs **THE SYSTEM SHALL** exit 0 with 0 failed tests.

**Verify** — every command, in order, run from the project root. Each one exits 0 when this task is correct. The last one exiting 0 is what makes the task done.

```bash
(cd backend && npx vitest run src/__tests__/workerShutdown.test.ts)
(cd backend && npx tsc --noEmit)
(cd backend && npm run build)
grep -q 'TelegramLinkGateway' backend/dist/worker.js
(cd backend && node -e "require('./dist/modules/notifications/infrastructure/TelegramLinkGateway.js')")
(cd backend && npx vitest run src/modules/notifications)
```

**Checkpoint**

```bash
git add -A && git commit -m "E2-T7: Run the link gateway in the worker"
git tag step-12-worker-gateway
```

Run both after the last `Verify` command exits 0. This is the last task of the change. Continue with the global acceptance gate in `blueprint.md` §20.1.

---

## Epic acceptance

The epic is done when every task is `done` **and**:

1. **WHEN** `(cd backend && npx vitest run src/modules/notifications src/__tests__/workerShutdown.test.ts)` runs **THE SYSTEM SHALL** exit 0 with 0 failed tests.
2. **WHEN** `(cd backend && npm run build)` runs and the built gateway and adapter are loaded with `require` **THE SYSTEM SHALL** exit 0 for each, without needing any environment variable.

```bash
(cd backend && npx tsc --noEmit)
(cd backend && npx vitest run src/modules/notifications src/__tests__/workerShutdown.test.ts)
(cd backend && npm run build)
(cd backend && node -e "require('./dist/modules/notifications/infrastructure/AppriseNotifier.js')")
(cd backend && node -e "require('./dist/modules/notifications/infrastructure/TelegramLinkGateway.js')")
```

Run from the project root. Both criteria are decided by these commands. Nothing here waits on a human or an external service. The live Telegram round trip is a post-build launch check in `blueprint.md` §20.1, not a task.

## Pitfalls

- **Importing `notificationsRouter` before `authRouter` in `server.ts`.** `IdentityProviderRegistry.resolve()` throws `Identity provider 'supabase' is not registered.` at boot.
- **Starting the gateway in `server.ts`.** Two pollers on one token make Telegram answer 409 forever. The gateway belongs in `worker.ts` only.
- **Letting a thrown `handleUpdate` stall the cursor.** Always advance `offset`, or one bad update blocks every later link.
- **Awaiting a 25-second long poll during shutdown.** `stop()` must abort the in-flight `fetch`.
- **Arrow-function mocks for `new TelegramLinkGateway(...)`.** vitest 4 throws "is not a constructor". Use a `class` in the factory.
- **Asserting Spanish error text in tests.** Assert `code` and status. The text is for humans.
- **Exposing `telegramChatId` on `/auth/me`.** `CurrentUserResolver` is frozen. Leave it alone.

## Before moving on

- [ ] Every task in this epic is `done` in `tasks.json` — no task left `in_progress`.
- [ ] Every `verify` command of every task in this epic passed, not just the first one.
- [ ] No `verify` command was edited, and none was skipped because a file it names did not exist.
- [ ] **Every task in this epic has its `checkpoint` tag in version control** — `step-06-notification-service` … `step-12-worker-gateway`, matching `tasks.json`. `for t in step-06-notification-service step-07-telegram-link-code step-08-link-gateway-matching step-09-link-gateway-polling step-10-notifications-controller step-11-notifications-routes step-12-worker-gateway; do git rev-parse -q --verify "refs/tags/$t" >/dev/null; done` exits 0 under `set -e` (a missing tag aborts the loop non-zero).
- [ ] Gate command passes clean, run from the project root.
- [ ] Every "Produced" contract above exists with the stated signature.
- [ ] No file outside the subtree was modified.
- [ ] `.env.example` — no variable added in this epic (all three were added in `E1-T1`).
- [ ] One commit per task, each prefixed with its task id, each followed by its checkpoint tag.
