# Epic 03: API keys over HTTP

> After this epic API-key traffic is rate-limited per key, `authenticateApiKeyOrSession` routes each request to the API-key path or the unchanged session path, `/api/v1/auth/api-keys` lets a session mint, list and revoke keys, and the 7 protected procurement routes plus the 12 analytics routes accept either a session or an API key.

| | |
|---|---|
| **Epic id** | `03-api-key-http` |
| **Tasks** | `E3-T1` … `E3-T6` (steps 13–18) |
| **Depends on** | `01-flags-and-seed`, `02-api-key-core` |
| **Unlocks** | nothing — this is the last epic; then run `blueprint.md` §20.1 |
| **Parallel with** | nothing |

You do not need any other file to complete this epic. Everything below is repeated here on purpose.

---

## Stack

Express 4 · TypeScript 5.9 (CommonJS, Node16, `strict`) · express-rate-limit **8.7.0** (its `limit` option accepts `number | (req, res) => number | Promise<number>`; `keyGenerator` is a function) + the existing `FallbackRedisStore` · zod 4 · winston · vitest 4 · supertest.
Package manager: `npm` in `backend/`. Runtime: Node 22. **No npm dependency, no env var, no compose change.**

All commands run from the **repository root**.

| Task | Command |
|---|---|
| Typecheck | `(cd backend && npx tsc --noEmit)` |
| Build | `(cd backend && npm run build)` → `backend/dist/server.js`, `backend/dist/worker.js` |
| Test (one file) | `(cd backend && npx vitest run <path from backend/>)` |
| Lint | NOT CONFIGURED — do not add one |
| Local services | none — every router test mocks Prisma, Redis, Supabase and the JWT validator |

**Gate:** `(cd backend && npx tsc --noEmit)` and the task's own vitest file(s) pass before any task is marked done.

## Directory subtree

```
backend/src/modules/
  identity/presentation/
    apiKeyRateLimiter.ts                 # NEW (E3-T1)
    authenticateApiKeyOrSession.ts       # NEW (E3-T2)
    apiKeyAuth.ts                        # NEW (E3-T2) — wiring singletons
    ApiKeySchemas.ts                     # NEW (E3-T3)
    ApiKeyController.ts                  # NEW (E3-T3)
    apiKeyRoutes.ts                      # NEW (E3-T4)
    routes.ts                            # exists — insertions (E3-T4)
  identity/__tests__/
    apiKeyRateLimiter.test.ts            # NEW (E3-T1)
    authenticateApiKeyOrSession.test.ts  # NEW (E3-T2)
    ApiKeyController.test.ts             # NEW (E3-T3)
    ApiKeyRoutes.test.ts                 # NEW (E3-T4)
  procurement/presentation/routes.ts     # exists — auth swap on 7 routes (E3-T5)
  procurement/__tests__/ProcurementApiKeyRoutes.test.ts   # NEW (E3-T5)
  analytics/presentation/routes.ts       # exists — auth swap on 12 routes (E3-T6)
  analytics/__tests__/AnalyticsRoutes.test.ts             # exists (from E1-T6) — new cases (E3-T6)
```

**Never edit** `AuthController.ts`, `CurrentUserResolver.ts`, `AuthMiddleware.ts`, `AuthenticatedUser.ts`, `requireCapability.ts`, `server.ts`, `worker.ts`, any existing IP limiter, `docker-compose.yml`, any `.env.example`, `backend/package.json` or the lockfile. Public procurement routes (`/departments`, `/cities`, `/entities`, `/entities/search`, `/years`, `/contracts`) never gain auth. Notifications and existing `/auth/*` routes stay session-only. If a task seems to need another file, stop and report.

## Data model touched here

| Entity | Use |
|---|---|
| `ApiKey` → `api_keys` | read by hash, created, listed, revoked through `ApiKeyService` (epic 02) |
| `Plan.apiRequestsPerMinute` | per-key limit, carried on `req.apiKey` |
| `FeatureFlag` | `API_ACCESS` (inside `ApiKeyAuthMiddleware`), `ANALYTICS` (analytics routes) |

## Contracts

**Consumed** — already exists, do not rebuild:

| From | Interface | Guarantee |
|---|---|---|
| `01` | `platform/presentation/requireFeatureEnabled.ts` → `checkFeatureEnabled(key)` | fail-open boolean |
| `01` | `platform/domain/featureFlags.ts` | `FEATURE_DISABLED_RESPONSE = { error: 'Esta funcionalidad está deshabilitada temporalmente. Intenta de nuevo más tarde.', code: 'FEATURE_DISABLED' }` |
| `01` | `analytics/presentation/routes.ts` | each of 12 lines reads `authMiddleware.handle, currentUserResolver.resolve, requireAnalytics, requireAnalyticsEnabled, (req, res) => …` |
| `01` | `analytics/__tests__/AnalyticsRoutes.test.ts` | hoisted `state = { flags, sessionCapabilities, apiKeyRow }`, mocks for env, jwtValidator, prisma (`user.upsert`, `plan.findUnique`, `featureFlag.findUnique`, `apiKey.findUnique` → `state.apiKeyRow`, `apiKey.update`), redis, rateLimitStore, express-rate-limit passthrough, logger, IdentityProviderRegistry, AnalyticsService, the controller Proxy; `ROUTES` (12 paths); `buildApp()` |
| `02` | `domain/ApiKey.ts` | `API_KEY_PATTERN`, `isApiKeyAuthorization(header)`, `ApiKeyRequestContext` |
| `02` | `domain/errors.ts` | `ApiKeyNotFoundError` (`code 'API_KEY_NOT_FOUND'`, message `Clave de API no encontrada.`) |
| `02` | `application/ApiKeyService.ts` | `ApiKeyService(prisma)`; `issue`, `listForUser`, `revoke`; types `ApiKeySummary`, `IssuedApiKey` |
| `02` | `presentation/ApiKeyAuthMiddleware.ts` | `new ApiKeyAuthMiddleware(service, checkFeatureEnabled).handle` — 503 / 401 `INVALID_API_KEY` / 403 `API_ACCESS_NOT_IN_PLAN`, sets `req.user`, `req.apiKey` |
| repo | `requireCapability(name)`, `validateRequest(schema)`, `AuthMiddleware`, `CurrentUserResolver` | existing bodies: 403 ``{ error: `Forbidden: Requires ${capability} capability` }``, 400 `{ error: 'Validation failed', details }`, 401 `{ error: 'Missing or invalid Authorization header' }` |

**Produced:**

| Export | Signature |
|---|---|
| `apiKeyRateLimiter.ts` | `createApiKeyRateLimiter(store: Store)`, `apiKeyRateLimitKey(req)`, `apiKeyRequestsPerMinute(req)`, `API_KEY_FALLBACK_REQUESTS_PER_MINUTE = 10`, `API_KEY_RATE_LIMIT_MESSAGE` |
| `authenticateApiKeyOrSession.ts` | `runHandlers`, `createAuthenticateApiKeyOrSession({ apiKeyHandlers, sessionHandlers })`, `requireSessionAuth`, `SESSION_REQUIRED_RESPONSE` |
| `apiKeyAuth.ts` | `apiKeyService`, `authenticateApiKeyOrSession(sessionHandlers: RequestHandler[]): RequestHandler` |
| `/api/v1/auth/api-keys` | POST 201 `{ id, name, keyPrefix, createdAt, key }` · GET 200 `{ apiKeys }` · DELETE `/:id` 200 summary / 404 |

## Conventions that bite in this area

- **Detection rule:** API-key path if and only if `Authorization` starts with the exact `Bearer ` and the token starts with `ck_live_`. Everything else gets the router's own session handlers, unchanged, in their existing order.
- **Session handlers are passed in, never recreated:** `authenticateApiKeyOrSession([authMiddleware.handle, currentUserResolver.resolve])` uses the router's existing instances.
- **The per-key limiter is created once** at module load in `apiKeyAuth.ts` (express-rate-limit warns if a limiter is created inside a handler).
- **Never log a key, its hash, its prefix or the `Authorization` header.**
- vitest 4: `vi.mock` factories are hoisted and may only use `vi.hoisted` state; mock paths are relative to the test file and must equal what the code under test imports. Router tests use supertest on a fresh `express()` with `express.json()`. No `.skip`/`.only`.
- **Standard test values:** key `'ck_live_' + 'A'.repeat(43)`; session token `Bearer test-token`; session user `00000000-0000-0000-0000-000000000001`; key owner `00000000-0000-0000-0000-0000000000aa`.

**Controller Proxy mock** (E3-T5 uses it for `ProcurementController`; E1-T6 already uses it for `AnalyticsController`):

```ts
vi.mock('../presentation/ProcurementController', () => ({
  ProcurementController: class {
    constructor() {
      return new Proxy(this, {
        get: (_target, prop) => (req: any, res: any) =>
          res.status(200).json({ handler: String(prop), userId: req.user?.id ?? null }),
      });
    }
  },
}));
```

Full project rules: `CLAUDE.md`. Area rules: `.claude/rules/api-keys.md`, `.claude/rules/feature-flags.md`, `.claude/rules/backend-tests.md` — in the repo root, copied from `blueprints/api-platform-and-flags/workspace/` by §10 Bootstrap of `blueprint.md`.

---

## Tasks

Listed in the same order as `tasks.json`. That order is the build order.

### `E3-T1` — Add the per-API-key rate limiter

**Depends on:** `E2-T2` · **Priority:** p0 — metadata for scope cuts, not a running order

Create `backend/src/modules/identity/presentation/apiKeyRateLimiter.ts` (mirrors the repo's limiter construction; differences: `keyGenerator` is the key id, and `limit` is a per-request function; the store is injected):

```ts
import type { Request } from 'express';
import rateLimit, { type Store } from 'express-rate-limit';
import type { ApiKeyRequestContext } from '../domain/ApiKey';

export const API_KEY_RATE_LIMIT_WINDOW_MS = 60 * 1000;
export const API_KEY_FALLBACK_REQUESTS_PER_MINUTE = 10;
export const API_KEY_RATE_LIMIT_MESSAGE = 'Demasiadas solicitudes con esta clave de API. Intenta de nuevo en un minuto.';

const apiKeyContext = (req: Request): ApiKeyRequestContext | undefined => (req as any).apiKey;

/** Counts per API key id, never per IP. */
export const apiKeyRateLimitKey = (req: Request): string => apiKeyContext(req)?.id ?? 'unknown';

/** The owner's plan limit; a missing or non-positive value falls back to 10 — never unlimited. */
export const apiKeyRequestsPerMinute = (req: Request): number => {
  const configured = apiKeyContext(req)?.apiRequestsPerMinute;
  return typeof configured === 'number' && configured > 0 ? configured : API_KEY_FALLBACK_REQUESTS_PER_MINUTE;
};

export const createApiKeyRateLimiter = (store: Store) =>
  rateLimit({
    windowMs: API_KEY_RATE_LIMIT_WINDOW_MS,
    limit: apiKeyRequestsPerMinute,
    standardHeaders: true,
    legacyHeaders: false,
    store,
    keyGenerator: apiKeyRateLimitKey,
    message: { error: API_KEY_RATE_LIMIT_MESSAGE },
  });
```

Create `backend/src/modules/identity/__tests__/apiKeyRateLimiter.test.ts` using the **real** express-rate-limit and `new MemoryStore()` (from `express-rate-limit`), one new store and app per test. App: `app.use((req, _res, next) => { (req as any).apiKey = { id: req.header('x-test-key-id'), apiRequestsPerMinute: req.header('x-test-rpm') ? Number(req.header('x-test-rpm')) : null }; next(); })`, then `app.use(createApiKeyRateLimiter(new MemoryStore()))`, then `app.get('/', (_req, res) => res.status(200).json({ ok: true }))`.

- key `A` with rpm `2`: three sequential requests → 200, 200, 429; the 429 body equals `{ error: API_KEY_RATE_LIMIT_MESSAGE }`.
- after `A` is exhausted, key `B` with rpm `2` → 200.
- key `C` with rpm `3`: three requests all 200.
- `apiKeyRequestsPerMinute` returns 10 for `apiRequestsPerMinute: null`, 10 for `0`, 60 for `60`, and 10 when `req.apiKey` is absent; `apiKeyRateLimitKey` returns the id, or `'unknown'` when absent.

**Files**
- `backend/src/modules/identity/presentation/apiKeyRateLimiter.ts` — new
- `backend/src/modules/identity/__tests__/apiKeyRateLimiter.test.ts` — new

**Acceptance**

Copied from this task's `acceptance` array in `tasks.json` — identical after the emphasis normalization defined in `agents/blueprint-writer.md` *Acceptance strings*.

1. **WHEN** a key whose plan allows 2 requests per minute sends 3 requests within the window **THE SYSTEM SHALL** answer 200, 200 and then 429 with `{ error: 'Demasiadas solicitudes con esta clave de API. Intenta de nuevo en un minuto.' }`.
2. **WHEN** one key has exhausted its limit **THE SYSTEM SHALL** still answer 200 to a different key, because the counter is keyed by API key id and not by IP.
3. **WHEN** a key's plan allows 3 requests per minute **THE SYSTEM SHALL** answer 200 to its third request, proving the limit is read per request from `req.apiKey.apiRequestsPerMinute`.
4. **WHEN** `apiRequestsPerMinute` is `null`, `0` or absent **THE SYSTEM SHALL** apply the fallback limit of 10.
5. **WHEN** `(cd backend && npx tsc --noEmit)` runs **THE SYSTEM SHALL** exit 0.

**Verify** — every command, in order, run from the project root. Each one exits 0 when this task is correct.

```bash
(cd backend && npx vitest run src/modules/identity/__tests__/apiKeyRateLimiter.test.ts)
(cd backend && npx tsc --noEmit)
```

**Checkpoint**

```bash
git add -A && git commit -m "E3-T1: Add the per-API-key rate limiter"
git tag step-13-api-key-rate-limiter
```

Rollback target before this task: `step-12-api-key-middleware`.

### `E3-T2` — Add authenticateApiKeyOrSession entry point

**Depends on:** `E1-T2`, `E2-T4`, `E2-T6`, `E3-T1` · **Priority:** p0 — metadata for scope cuts, not a running order

Create `backend/src/modules/identity/presentation/authenticateApiKeyOrSession.ts`:

```ts
import { Request, Response, NextFunction, RequestHandler } from 'express';
import { isApiKeyAuthorization } from '../domain/ApiKey';

export const SESSION_REQUIRED_RESPONSE = {
  error: 'Las claves de API no pueden administrar claves de API. Usa tu sesión de la aplicación web.',
  code: 'SESSION_REQUIRED',
} as const;

/** Runs Express handlers in order; stops when one responds without calling next(). */
export const runHandlers = (handlers: RequestHandler[], req: Request, res: Response, done: NextFunction): void => {
  let index = 0;
  const step = (error?: unknown): void => {
    if (error) {
      done(error);
      return;
    }
    const handler = handlers[index++];
    if (!handler) {
      done();
      return;
    }
    try {
      const result: unknown = handler(req, res, step);
      if (result instanceof Promise) result.catch(done);
    } catch (thrown) {
      done(thrown);
    }
  };
  step();
};

export interface AuthenticateApiKeyOrSessionDeps {
  apiKeyHandlers: RequestHandler[];
  sessionHandlers: RequestHandler[];
}

/**
 * `Authorization: Bearer ck_live_…` → the API-key handlers; anything else → the session
 * handlers, unchanged (they keep answering exactly as before for a missing or invalid header).
 */
export const createAuthenticateApiKeyOrSession = ({ apiKeyHandlers, sessionHandlers }: AuthenticateApiKeyOrSessionDeps): RequestHandler =>
  (req, res, next) =>
    runHandlers(isApiKeyAuthorization(req.headers.authorization) ? apiKeyHandlers : sessionHandlers, req, res, next);

/** First handler on key-management routes: an API key can never mint, list or revoke keys. */
export const requireSessionAuth: RequestHandler = (req, res, next) => {
  if (isApiKeyAuthorization(req.headers.authorization)) {
    res.status(403).json({ ...SESSION_REQUIRED_RESPONSE });
    return;
  }
  next();
};
```

Create `backend/src/modules/identity/presentation/apiKeyAuth.ts`:

```ts
import { RequestHandler } from 'express';
import { prisma } from '../../../infrastructure/db/prisma';
import { redisAppClient } from '../../../infrastructure/redis/redisAppClient';
import { FallbackRedisStore } from '../../../infrastructure/security/rateLimitStore';
import { checkFeatureEnabled } from '../../platform/presentation/requireFeatureEnabled';
import { ApiKeyService } from '../application/ApiKeyService';
import { ApiKeyAuthMiddleware } from './ApiKeyAuthMiddleware';
import { createApiKeyRateLimiter } from './apiKeyRateLimiter';
import { createAuthenticateApiKeyOrSession } from './authenticateApiKeyOrSession';

export const apiKeyService = new ApiKeyService(prisma);

const apiKeyAuthMiddleware = new ApiKeyAuthMiddleware(apiKeyService, checkFeatureEnabled);
const apiKeyRateLimiter = createApiKeyRateLimiter(new FallbackRedisStore(redisAppClient, 'rl:apikey:'));

/**
 * Drop-in replacement for `authMiddleware.handle, currentUserResolver.resolve` on routes that
 * machine clients may call. Pass the router's existing session handlers, in their existing order.
 */
export const authenticateApiKeyOrSession = (sessionHandlers: RequestHandler[]): RequestHandler =>
  createAuthenticateApiKeyOrSession({
    apiKeyHandlers: [apiKeyAuthMiddleware.handle, apiKeyRateLimiter],
    sessionHandlers,
  });
```

Create `backend/src/modules/identity/__tests__/authenticateApiKeyOrSession.test.ts`. Mocks (for the wiring case): `'../../../infrastructure/db/prisma'` → `{ prisma: { featureFlag: { findUnique: vi.fn(async () => ({ enabled: false })) }, apiKey: { findUnique: vi.fn(), update: vi.fn() }, plan: { findUnique: vi.fn() } } }`, `'../../../infrastructure/redis/redisAppClient'` → `{ redisAppClient: {} }`, `'../../../infrastructure/security/rateLimitStore'` → `{ FallbackRedisStore: class {} }`, `'express-rate-limit'` → `{ default: () => (_req: any, _res: any, next: any) => next() }`, logger mocked. Each app: `express()` + the handler under test + `app.get('/x', (_req, res) => res.status(200).json({ reached: true }))` + `app.use((err: any, _req: any, res: any, _next: any) => res.status(500).json({ error: 'boom' }))`. Spy handlers push a label into a shared `order` array and call `next()`.

- API-key header (`Bearer ` + KEY): `order` equals `['api-1', 'api-2']`, status 200.
- `Bearer eyJhbGciOiJIUzI1NiJ9.e30.sig`: `order` equals `['session-1', 'session-2']`.
- no header: `order` equals `['session-1', 'session-2']`.
- first API handler does `res.status(401).json({ error: 'nope' })` without `next`: 401, `order` equals `['api-1']`, route not reached.
- an async API handler that rejects: 500 `{ error: 'boom' }`.
- `requireSessionAuth`: API-key header → 403 with body equal to `SESSION_REQUIRED_RESPONSE`; `Bearer eyJ…` → route reached, 200.
- wiring: `authenticateApiKeyOrSession([sessionSpy])` from `'../presentation/apiKeyAuth'` with the API-key header → 503 `code: 'FEATURE_DISABLED'`, `prisma.apiKey.findUnique` not called, `sessionSpy` not called.

**Files**
- `backend/src/modules/identity/presentation/authenticateApiKeyOrSession.ts` — new
- `backend/src/modules/identity/presentation/apiKeyAuth.ts` — new
- `backend/src/modules/identity/__tests__/authenticateApiKeyOrSession.test.ts` — new

**Acceptance**

Copied from this task's `acceptance` array in `tasks.json` — identical after the emphasis normalization defined in `agents/blueprint-writer.md` *Acceptance strings*.

1. **WHEN** a request carries `Authorization: Bearer ck_live_…` **THE SYSTEM SHALL** run the API-key handlers in order and SHALL NOT run the session handlers.
2. **WHEN** a request carries a `Bearer eyJ…` JWT or no `Authorization` header **THE SYSTEM SHALL** run the session handlers in order and SHALL NOT run the API-key handlers.
3. **WHEN** a handler in the chain responds without calling `next` **THE SYSTEM SHALL** run no later handler, and WHEN an async handler rejects THE SYSTEM SHALL pass the error to Express's error handler.
4. **WHEN** `requireSessionAuth` receives an API key **THE SYSTEM SHALL** respond 403 `{ error: 'Las claves de API no pueden administrar claves de API. Usa tu sesión de la aplicación web.', code: 'SESSION_REQUIRED' }`, and for a JWT SHALL call `next`.
5. **WHEN** the wired `authenticateApiKeyOrSession` receives an API key while `API_ACCESS` is disabled **THE SYSTEM SHALL** respond 503 `code: 'FEATURE_DISABLED'` without looking the key up and without running the session handlers.
6. **WHEN** `(cd backend && npm run build)` runs and `node` requires the built `dist/modules/identity/presentation/authenticateApiKeyOrSession.js` **THE SYSTEM SHALL** exit 0.

**Verify** — every command, in order, run from the project root. Each one exits 0 when this task is correct.

```bash
(cd backend && npx vitest run src/modules/identity/__tests__/authenticateApiKeyOrSession.test.ts)
(cd backend && npx tsc --noEmit)
(cd backend && npm run build)
(cd backend && node -e "require('./dist/modules/identity/presentation/authenticateApiKeyOrSession.js')")
```

**Checkpoint**

```bash
git add -A && git commit -m "E3-T2: Add authenticateApiKeyOrSession entry point"
git tag step-14-api-key-or-session
```

Rollback target before this task: `step-13-api-key-rate-limiter`.

### `E3-T3` — Add ApiKeyController and schemas

**Depends on:** `E2-T5` · **Priority:** p0 — metadata for scope cuts, not a running order

Create `backend/src/modules/identity/presentation/ApiKeySchemas.ts`:

```ts
import { z } from 'zod';

export const CreateApiKeySchema = z.strictObject({
  name: z.string().trim().min(1).max(100),
});

/** Shape check before Prisma sees a @db.Uuid value; anything else is answered 404. */
export const ApiKeyIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/);
```

Create `backend/src/modules/identity/presentation/ApiKeyController.ts` (`AuthController.ts` is frozen):

```ts
import { Request, Response } from 'express';
import { logger } from '../../../infrastructure/logger';
import { ApiKeyNotFoundError } from '../domain/errors';
import type { ApiKeySummary, IssuedApiKey } from '../application/ApiKeyService';
import { ApiKeyIdSchema, CreateApiKeySchema } from './ApiKeySchemas';

export interface ApiKeyManager {
  issue(userId: string, name: string): Promise<IssuedApiKey>;
  listForUser(userId: string): Promise<ApiKeySummary[]>;
  revoke(userId: string, apiKeyId: string): Promise<ApiKeySummary>;
}

const notFound = (res: Response) => {
  const error = new ApiKeyNotFoundError();
  return res.status(404).json({ error: error.message, code: error.code });
};

export class ApiKeyController {
  constructor(private readonly apiKeys: ApiKeyManager) {}

  async create(req: Request, res: Response) {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const parsed = CreateApiKeySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.format() });
    }

    try {
      const issued = await this.apiKeys.issue(user.id, parsed.data.name);
      return res.status(201).json(issued);
    } catch (error) {
      return this.fail(res, user.id, error);
    }
  }

  async list(req: Request, res: Response) {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const apiKeys = await this.apiKeys.listForUser(user.id);
      return res.status(200).json({ apiKeys });
    } catch (error) {
      return this.fail(res, user.id, error);
    }
  }

  async revoke(req: Request, res: Response) {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const parsed = ApiKeyIdSchema.safeParse(req.params.id);
    if (!parsed.success) return notFound(res);

    try {
      const summary = await this.apiKeys.revoke(user.id, parsed.data);
      return res.status(200).json(summary);
    } catch (error) {
      if (error instanceof ApiKeyNotFoundError) return notFound(res);
      return this.fail(res, user.id, error);
    }
  }

  private fail(res: Response, userId: string, error: unknown) {
    logger.error('API key endpoint error', { userId, error: error instanceof Error ? error.message : String(error) });
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
```

Create `backend/src/modules/identity/__tests__/ApiKeyController.test.ts` with a fake manager (`issue`, `listForUser`, `revoke` as `vi.fn()`), fake `res`, logger mocked, `KEY_ID = '3f1c2a8e-5b7d-4c9e-9a1b-2d3e4f5a6b7c'`:

- `create` with `req.user = { id: 'user-1' }`, body `{ name: '  ERP  ' }` → `issue` called with `('user-1', 'ERP')`, 201 with the issued object.
- `create` without `req.user` → 401 `{ error: 'Unauthorized' }`, `issue` not called (same check for `list` and `revoke`).
- `list` → 200 `{ apiKeys: <listForUser result> }`.
- `revoke` with `params.id = 'not-a-uuid'` → 404 `{ error: 'Clave de API no encontrada.', code: 'API_KEY_NOT_FOUND' }`, `revoke` not called.
- `revoke` with `KEY_ID` and the manager rejecting `new ApiKeyNotFoundError()` → the same 404 body.
- `revoke` with `KEY_ID` and the manager rejecting `new Error('db')` → 500 `{ error: 'Internal Server Error' }`, `logger.error` called with `'API key endpoint error'`.

**Files**
- `backend/src/modules/identity/presentation/ApiKeySchemas.ts` — new
- `backend/src/modules/identity/presentation/ApiKeyController.ts` — new
- `backend/src/modules/identity/__tests__/ApiKeyController.test.ts` — new

**Acceptance**

Copied from this task's `acceptance` array in `tasks.json` — identical after the emphasis normalization defined in `agents/blueprint-writer.md` *Acceptance strings*.

1. **WHEN** `create` runs for an authenticated user with body `{ name: '  ERP  ' }` **THE SYSTEM SHALL** call `issue` with the trimmed name `ERP` and respond 201 with the issued key object.
2. **WHEN** any of `create`, `list` or `revoke` runs without `req.user` **THE SYSTEM SHALL** respond 401 `{ error: 'Unauthorized' }` and call no service method.
3. **WHEN** `list` runs **THE SYSTEM SHALL** respond 200 `{ apiKeys: [...] }` with the service's summaries.
4. **WHEN** `revoke` receives an id that is not UUID-shaped, or the service throws `ApiKeyNotFoundError`, **THE SYSTEM SHALL** respond 404 `{ error: 'Clave de API no encontrada.', code: 'API_KEY_NOT_FOUND' }`.
5. **WHEN** the service throws any other error **THE SYSTEM SHALL** respond 500 `{ error: 'Internal Server Error' }` and log `API key endpoint error`.
6. **WHEN** `(cd backend && npx tsc --noEmit)` runs **THE SYSTEM SHALL** exit 0.

**Verify** — every command, in order, run from the project root. Each one exits 0 when this task is correct.

```bash
(cd backend && npx vitest run src/modules/identity/__tests__/ApiKeyController.test.ts)
(cd backend && npx tsc --noEmit)
```

**Checkpoint**

```bash
git add -A && git commit -m "E3-T3: Add ApiKeyController and schemas"
git tag step-15-api-key-controller
```

Rollback target before this task: `step-14-api-key-or-session`.

### `E3-T4` — Mount session-only /auth/api-keys routes

**Depends on:** `E3-T2`, `E3-T3` · **Priority:** p0 — metadata for scope cuts, not a running order

Create `backend/src/modules/identity/presentation/apiKeyRoutes.ts`:

```ts
import { Router, RequestHandler } from 'express';
import { requireCapability } from './requireCapability';
import { validateRequest } from './ValidationMiddleware';
import { requireSessionAuth } from './authenticateApiKeyOrSession';
import { CreateApiKeySchema } from './ApiKeySchemas';
import { ApiKeyController } from './ApiKeyController';

export interface ApiKeysRouterDeps {
  sessionHandlers: RequestHandler[];
  limiter: RequestHandler;
  controller: ApiKeyController;
}

/** Session JWT only on every route: requireSessionAuth runs before the JWT is parsed. */
export const createApiKeysRouter = ({ sessionHandlers, limiter, controller }: ApiKeysRouterDeps): Router => {
  const router = Router();

  router.post('/', requireSessionAuth, ...sessionHandlers, limiter, requireCapability('USE_API'), validateRequest(CreateApiKeySchema), (req, res) => controller.create(req, res));
  router.get('/', requireSessionAuth, ...sessionHandlers, limiter, (req, res) => controller.list(req, res));
  router.delete('/:id', requireSessionAuth, ...sessionHandlers, limiter, (req, res) => controller.revoke(req, res));

  return router;
};
```

Edit `backend/src/modules/identity/presentation/routes.ts` — insertions only:

1. After `import { RegisterSchema, LoginSchema, RefreshSchema, ResetPasswordSchema } from './AuthSchemas';` add:
   ```ts
   import { ApiKeyController } from './ApiKeyController';
   import { createApiKeysRouter } from './apiKeyRoutes';
   import { apiKeyService } from './apiKeyAuth';
   ```
2. After the closing `);` of the `authRouter.patch('/profile', …)` call and before `export { authRouter };`, add:
   ```ts

   // API key management — session JWT only; an API key can never mint, list or revoke keys.
   const apiKeysLimiter = rateLimit({
     windowMs: 60 * 1000,
     max: 10,
     standardHeaders: true,
     legacyHeaders: false,
     store: new FallbackRedisStore(redisAppClient, 'rl:api-keys:'),
     message: { error: 'Demasiadas solicitudes de administración de claves de API. Intenta de nuevo en un minuto.' },
   });

   authRouter.use('/api-keys', createApiKeysRouter({
     sessionHandlers: [authMiddleware.handle, currentUserResolver.resolve],
     limiter: apiKeysLimiter,
     controller: new ApiKeyController(apiKeyService),
   }));
   ```

Create `backend/src/modules/identity/__tests__/ApiKeyRoutes.test.ts`, driving the **real** `authRouter` mounted at `/api/v1/auth`. Hoisted `state = { capabilities: ['USE_FAVORITES', 'USE_API'] as string[] }`, reset before every test by `beforeEach(() => { vi.clearAllMocks(); state.capabilities = ['USE_FAVORITES', 'USE_API']; })`. Mocks:

- `'../../../infrastructure/config/env'` → `{ config: { SUPABASE_URL: 'http://localhost', SUPABASE_PUBLISHABLE_KEY: 'anon', AUTH_JWKS_URL: 'http://localhost' } }`
- `'../../../infrastructure/security/jwtValidator'` → `{ jwtValidator: { verify: vi.fn(async () => ({ sub: '00000000-0000-0000-0000-000000000001' })) } }`
- `'../infrastructure/SupabaseIdentityProvider'` → `{ SupabaseIdentityProvider: class { async getUser() { return { id: '00000000-0000-0000-0000-000000000001', email: 'owner@test.com', roles: ['USER'], permissions: [] }; } } }`
- `'../../../infrastructure/db/prisma'` → `user.upsert` resolving `{ id: '00000000-0000-0000-0000-000000000001', email: 'owner@test.com', name: null, roles: ['USER'], phone: null, telegramUsername: null, notifyEmail: false, notifyTelegram: false, notifySms: false, planId: null, planExpiresAt: null, plan: { name: 'BUSINESS', maxFavoriteEntities: 25, capabilities: state.capabilities.map((name) => ({ capability: { name } })) } }`; `plan.findUnique` → `null`; `featureFlag.findUnique` → `null`; `apiKey.create` → `vi.fn(async ({ data }: any) => ({ id: '3f1c2a8e-5b7d-4c9e-9a1b-2d3e4f5a6b7c', name: data.name, keyPrefix: data.keyPrefix, createdAt: new Date('2026-12-01T00:00:00.000Z') }))`; `apiKey.findMany` → one summary row `{ id: '3f1c2a8e-5b7d-4c9e-9a1b-2d3e4f5a6b7c', name: 'ERP', keyPrefix: 'ck_live_AbCd', createdAt: new Date('2026-12-01T00:00:00.000Z'), lastUsedAt: null, revokedAt: null }`; `apiKey.findFirst` → `null`; `apiKey.update` and `apiKey.findUnique` → `vi.fn()`; `auditLog: { create: vi.fn(async () => ({})) }`
- `'../../../infrastructure/redis/redisAppClient'` → `{ redisAppClient: {} }`; `'../../../infrastructure/security/rateLimitStore'` → `{ FallbackRedisStore: class {} }`; `'express-rate-limit'` → `{ default: () => (_req: any, _res: any, next: any) => next() }`; logger mocked.

Tests (`SESSION = 'Bearer test-token'`, `KEY = 'ck_live_' + 'A'.repeat(43)`):

- `POST /api/v1/auth/api-keys` with `SESSION` and `{ name: 'Integración ERP' }` → 201; `body.key` matches `API_KEY_PATTERN`; `body.keyPrefix === body.key.slice(0, 12)`; `'keyHash' in body` is false.
- same POST with `Authorization: Bearer ` + KEY → 403 `code: 'SESSION_REQUIRED'`; `prisma.apiKey.create` and `jwtValidator.verify` not called.
- `state.capabilities = ['USE_FAVORITES']`, POST with `SESSION` → 403 `{ error: 'Forbidden: Requires USE_API capability' }`; `create` not called.
- POST with `SESSION` and `{}` → 400, `body.error === 'Validation failed'`.
- `GET /api/v1/auth/api-keys` with `SESSION` → 200, `Array.isArray(body.apiKeys)`, and `JSON.stringify(body)` does not contain `keyHash`.
- `DELETE /api/v1/auth/api-keys/3f1c2a8e-5b7d-4c9e-9a1b-2d3e4f5a6b7c` with `SESSION` (findFirst `null`) → 404 `code: 'API_KEY_NOT_FOUND'`; `GET /api/v1/auth/api-keys` without `Authorization` → 401; `GET /api/v1/auth/me` with `SESSION` → 200.

**Files**
- `backend/src/modules/identity/presentation/apiKeyRoutes.ts` — new
- `backend/src/modules/identity/presentation/routes.ts` — edit: insertions only
- `backend/src/modules/identity/__tests__/ApiKeyRoutes.test.ts` — new

**Acceptance**

Copied from this task's `acceptance` array in `tasks.json` — identical after the emphasis normalization defined in `agents/blueprint-writer.md` *Acceptance strings*.

1. **WHEN** a BUSINESS session sends `POST /api/v1/auth/api-keys` with `{ name: 'Integración ERP' }` **THE SYSTEM SHALL** respond 201 with a `key` matching `^ck_live_[A-Za-z0-9_-]{43}$`, a `keyPrefix` equal to its first 12 characters, and no `keyHash` field.
2. **WHEN** `POST /api/v1/auth/api-keys` arrives with an API key in `Authorization` **THE SYSTEM SHALL** respond 403 `code: 'SESSION_REQUIRED'` without verifying a JWT and without creating a key.
3. **WHEN** a session whose plan lacks `USE_API` sends the POST **THE SYSTEM SHALL** respond 403 `{ error: 'Forbidden: Requires USE_API capability' }`, and WHEN the body is `{}` THE SYSTEM SHALL respond 400 `Validation failed`.
4. **WHEN** a session sends `GET /api/v1/auth/api-keys` **THE SYSTEM SHALL** respond 200 `{ apiKeys: [...] }` whose JSON contains no `keyHash`.
5. **WHEN** a session sends `DELETE /api/v1/auth/api-keys/<uuid>` for a key it does not own **THE SYSTEM SHALL** respond 404 `code: 'API_KEY_NOT_FOUND'`; WHEN no `Authorization` is sent THE SYSTEM SHALL respond 401; and `GET /api/v1/auth/me` with a session SHALL still respond 200.
6. **WHEN** `backend/src/modules/identity/presentation/routes.ts` is compared with the previous step **THE SYSTEM SHALL** show zero removed lines, and `(cd backend && npx tsc --noEmit)` and `UpdateProfile.test.ts` SHALL exit 0.

**Verify** — every command, in order, run from the project root. Each one exits 0 when this task is correct.

```bash
(cd backend && npx vitest run src/modules/identity/__tests__/ApiKeyRoutes.test.ts src/modules/identity/__tests__/UpdateProfile.test.ts)
git rev-parse --verify -q HEAD >/dev/null && test -z "$(git diff -U0 HEAD -- backend/src/modules/identity/presentation/routes.ts | grep -E '^-([^-]|$)')"
(cd backend && npx tsc --noEmit)
```

**Checkpoint**

```bash
git add -A && git commit -m "E3-T4: Mount session-only /auth/api-keys routes"
git tag step-16-api-key-routes
```

Rollback target before this task: `step-15-api-key-controller`.

### `E3-T5` — Accept API keys on protected procurement routes

**Depends on:** `E3-T2` · **Priority:** p0 — metadata for scope cuts, not a running order

Edit `backend/src/modules/procurement/presentation/routes.ts`:

1. After `import { jwtValidator } from '../../../infrastructure/security/jwtValidator';` add `import { authenticateApiKeyOrSession } from '../../identity/presentation/apiKeyAuth';`
2. After `const currentUserResolver = new CurrentUserResolver(identityService);` add `const authenticate = authenticateApiKeyOrSession([authMiddleware.handle, currentUserResolver.resolve]);`
3. In each of the 7 protected routes — `GET /similarity`, `POST /favorites`, `GET /favorites`, `DELETE /favorites`, `POST /favorite-entities`, `GET /favorite-entities`, `DELETE /favorite-entities` — replace the two lines `  authMiddleware.handle,` and `  currentUserResolver.resolve,` with the single line `  authenticate,`.

The 6 public routes and both IP limiters are not touched. All 7 routes accept keys: the controllers already enforce `USE_FAVORITES`, `VIEW_SIMILARITY_ANALYSIS` and `maxFavoriteEntities` from `req.user`.

Create `backend/src/modules/procurement/__tests__/ProcurementApiKeyRoutes.test.ts`. Hoisted `state = { flags: {} as Record<string, boolean>, apiKeyRow: null as any }`, reset before every test by `beforeEach(() => { vi.clearAllMocks(); state.flags = {}; state.apiKeyRow = null; })`. Mocks:

- `'../../../infrastructure/config/env'` → `{ config: {} }`
- `'../../../infrastructure/security/jwtValidator'` → `{ jwtValidator: { verify: vi.fn(async () => ({ sub: '00000000-0000-0000-0000-000000000001' })) } }`
- `'../../identity/infrastructure/IdentityProviderRegistry'` → `{ IdentityProviderRegistry: { resolve: () => ({ getUser: async () => ({ id: '00000000-0000-0000-0000-000000000001', email: 'web@test.com', roles: ['USER'], permissions: [] }) }) } }`
- `'../../../infrastructure/db/prisma'` → `user.upsert` resolving `{ id: '00000000-0000-0000-0000-000000000001', email: 'web@test.com', name: null, roles: ['USER'], phone: null, telegramUsername: null, notifyEmail: false, notifyTelegram: false, notifySms: false, planId: null, planExpiresAt: null, plan: { name: 'STARTER', maxFavoriteEntities: 3, capabilities: [{ capability: { name: 'USE_FAVORITES' } }] } }`; `plan.findUnique` → `null`; `featureFlag.findUnique: vi.fn(async ({ where }: any) => (where.key in state.flags ? { enabled: state.flags[where.key] } : null))`; `apiKey: { findUnique: vi.fn(async () => state.apiKeyRow), update: vi.fn(async () => ({})) }`
- `'../../../infrastructure/redis/redisAppClient'` → `{ redisAppClient: {} }`; `'../../../infrastructure/security/rateLimitStore'` → `{ FallbackRedisStore: class {} }`; `'express-rate-limit'` → passthrough; `'../../../infrastructure/logger'` mocked
- `'../infrastructure/SocrataContractProvider'` → `{ SocrataContractProvider: class {} }`; `'../application/ProcurementService'` → `{ ProcurementService: class {} }`; the controller Proxy mock shown in *Conventions* above.

`activeKeyRow()` returns `{ id: 'key-1', revokedAt: null, user: { id: '00000000-0000-0000-0000-0000000000aa', email: 'erp@test.com', name: null, roles: ['USER'], phone: null, telegramUsername: null, notifyEmail: false, notifyTelegram: false, notifySms: false, planExpiresAt: null, plan: { name: 'BUSINESS', maxFavoriteEntities: 25, apiRequestsPerMinute: 60, capabilities: ['USE_FAVORITES', 'VIEW_SIMILARITY_ANALYSIS', 'USE_ANALYTICS', 'USE_API'].map((name) => ({ capability: { name } })) } } }`.
`PROTECTED = [['get','/similarity'], ['post','/favorites'], ['get','/favorites'], ['delete','/favorites'], ['post','/favorite-entities'], ['get','/favorite-entities'], ['delete','/favorite-entities']]`; `PUBLIC = ['/departments', '/cities', '/entities', '/entities/search', '/years', '/contracts']`. `buildApp()` imports `procurementRouter` from `'../presentation/routes'` and mounts it at `/api/v1/procurement`.

- `it.each(PROTECTED)` with `state.apiKeyRow = activeKeyRow()` and the API key → 200, `body.userId === '00000000-0000-0000-0000-0000000000aa'`; `jwtValidator.verify` not called.
- `it.each(PROTECTED)` with `Bearer test-token` → 200, `body.userId === '00000000-0000-0000-0000-000000000001'`.
- revoked row (`{ ...activeKeyRow(), revokedAt: new Date() }`) → `GET /favorites` with the key → 401 `code: 'INVALID_API_KEY'`.
- `state.flags.API_ACCESS = false` → `GET /favorites` with the key → 503 `code: 'FEATURE_DISABLED'`; the same route with `Bearer test-token` → 200.
- `it.each(PUBLIC)` with no `Authorization` → 200.
- `GET /favorites` with no `Authorization` → 401 `{ error: 'Missing or invalid Authorization header' }`.

**Files**
- `backend/src/modules/procurement/presentation/routes.ts` — edit
- `backend/src/modules/procurement/__tests__/ProcurementApiKeyRoutes.test.ts` — new

**Acceptance**

Copied from this task's `acceptance` array in `tasks.json` — identical after the emphasis normalization defined in `agents/blueprint-writer.md` *Acceptance strings*.

1. **WHEN** each of the 7 protected procurement routes is called with an active BUSINESS API key **THE SYSTEM SHALL** reach the controller with `req.user.id` equal to the key owner's id, without verifying a JWT.
2. **WHEN** each of the 7 protected routes is called with a session token **THE SYSTEM SHALL** reach the controller with the session user, and WHEN no `Authorization` is sent THE SYSTEM SHALL respond 401 `{ error: 'Missing or invalid Authorization header' }` exactly as before.
3. **WHEN** a revoked API key is used **THE SYSTEM SHALL** respond 401 `code: 'INVALID_API_KEY'`, and WHEN `API_ACCESS` is disabled THE SYSTEM SHALL respond 503 `code: 'FEATURE_DISABLED'` to the key while a session request to the same route still gets 200.
4. **WHEN** each of the 6 public procurement routes is called without `Authorization` **THE SYSTEM SHALL** respond 200.
5. **WHEN** `backend/src/modules/procurement/presentation/routes.ts` is searched **THE SYSTEM SHALL** find no line `  currentUserResolver.resolve,` and exactly 7 lines `  authenticate,`, and `(cd backend && npx tsc --noEmit)` SHALL exit 0.

**Verify** — every command, in order, run from the project root. Each one exits 0 when this task is correct.

```bash
(cd backend && npx vitest run src/modules/procurement/__tests__/ProcurementApiKeyRoutes.test.ts)
status=0; grep -q '^  currentUserResolver.resolve,$' backend/src/modules/procurement/presentation/routes.ts || status=$?; test "$status" -eq 1
test "$(grep -c '^  authenticate,$' backend/src/modules/procurement/presentation/routes.ts)" -eq 7
(cd backend && npx tsc --noEmit)
```

**Checkpoint**

```bash
git add -A && git commit -m "E3-T5: Accept API keys on protected procurement routes"
git tag step-17-procurement-api-keys
```

Rollback target before this task: `step-16-api-key-routes`.

### `E3-T6` — Accept API keys on analytics routes

**Depends on:** `E1-T6`, `E3-T2` · **Priority:** p0 — metadata for scope cuts, not a running order

Edit `backend/src/modules/analytics/presentation/routes.ts`:

1. After `import { requireFeatureEnabled } from '../../platform/presentation/requireFeatureEnabled';` add `import { authenticateApiKeyOrSession } from '../../identity/presentation/apiKeyAuth';`
2. After `const currentUserResolver = new CurrentUserResolver(identityService);` add `const authenticate = authenticateApiKeyOrSession([authMiddleware.handle, currentUserResolver.resolve]);`
3. In each of the 12 route lines replace `authMiddleware.handle, currentUserResolver.resolve, requireAnalytics, requireAnalyticsEnabled,` with `authenticate, requireAnalytics, requireAnalyticsEnabled,`.

Edit `backend/src/modules/analytics/__tests__/AnalyticsRoutes.test.ts` (its mocks already cover this wiring): add an `activeKeyRow(capabilities: string[])` helper shaped like `E3-T5`'s (owner `00000000-0000-0000-0000-0000000000aa`, plan `BUSINESS`, `apiRequestsPerMinute: 60`, the given capabilities) and these tests, keeping every existing test:

- `it.each(ROUTES)` with `state.apiKeyRow = activeKeyRow(['USE_ANALYTICS', 'USE_API'])` and the API key → 200, `body.userId === '00000000-0000-0000-0000-0000000000aa'`.
- `activeKeyRow(['USE_API'])` → `GET /api/v1/analytics/contracts/trends` → 403 `{ error: 'Forbidden: Requires USE_ANALYTICS capability' }`.
- `activeKeyRow(['USE_ANALYTICS'])` → 403 `code: 'API_ACCESS_NOT_IN_PLAN'`.
- `activeKeyRow(['USE_ANALYTICS', 'USE_API'])` with `state.flags.ANALYTICS = false` → 503 `code: 'FEATURE_DISABLED'`.
- same key with `state.flags.API_ACCESS = false` → 503 `code: 'FEATURE_DISABLED'`, while a `Bearer test-token` request to the same route → 200.

**Files**
- `backend/src/modules/analytics/presentation/routes.ts` — edit
- `backend/src/modules/analytics/__tests__/AnalyticsRoutes.test.ts` — edit: new cases

**Acceptance**

Copied from this task's `acceptance` array in `tasks.json` — identical after the emphasis normalization defined in `agents/blueprint-writer.md` *Acceptance strings*.

1. **WHEN** each of the 12 analytics routes is called with an active API key whose plan grants `USE_ANALYTICS` and `USE_API` **THE SYSTEM SHALL** reach the controller with `req.user.id` equal to the key owner's id.
2. **WHEN** the API key's plan grants `USE_API` but not `USE_ANALYTICS` **THE SYSTEM SHALL** respond 403 `{ error: 'Forbidden: Requires USE_ANALYTICS capability' }`, and WHEN it grants `USE_ANALYTICS` but not `USE_API` THE SYSTEM SHALL respond 403 `code: 'API_ACCESS_NOT_IN_PLAN'`.
3. **WHEN** the `ANALYTICS` flag is disabled **THE SYSTEM SHALL** respond 503 `code: 'FEATURE_DISABLED'` to an authorized API key, and WHEN `API_ACCESS` is disabled THE SYSTEM SHALL respond 503 to the key while a session request still gets 200.
4. **WHEN** `AnalyticsRoutes.test.ts` runs **THE SYSTEM SHALL** still pass every step-6 session case (12 routes at 200, 503 with the flag off, 403 without `USE_ANALYTICS`, 401 without `Authorization`).
5. **WHEN** `backend/src/modules/analytics/presentation/routes.ts` is searched **THE SYSTEM SHALL** find no route line containing `authMiddleware.handle, currentUserResolver.resolve, requireAnalytics` and exactly 12 lines containing `authenticate, requireAnalytics, requireAnalyticsEnabled, (req, res)`.
6. **WHEN** `(cd backend && npx tsc --noEmit)` and `(cd backend && npm run build)` run **THE SYSTEM SHALL** exit 0, and the build SHALL produce `backend/dist/server.js` and `backend/dist/worker.js`.

**Verify** — every command, in order, run from the project root. Each one exits 0 when this task is correct.

```bash
(cd backend && npx vitest run src/modules/analytics/__tests__/AnalyticsRoutes.test.ts)
status=0; grep -qF 'authMiddleware.handle, currentUserResolver.resolve, requireAnalytics' backend/src/modules/analytics/presentation/routes.ts || status=$?; test "$status" -eq 1
test "$(grep -cF 'authenticate, requireAnalytics, requireAnalyticsEnabled, (req, res)' backend/src/modules/analytics/presentation/routes.ts)" -eq 12
(cd backend && npx tsc --noEmit)
(cd backend && npm run build)
test -f backend/dist/server.js && test -f backend/dist/worker.js
```

**Checkpoint**

```bash
git add -A && git commit -m "E3-T6: Accept API keys on analytics routes"
git tag step-18-analytics-api-keys
```

Rollback target before this task: `step-17-procurement-api-keys`.

---

## Epic done when

All six tasks are `done` in `tasks.json`, their six tags exist, and `blueprint.md` §20.1's global gate exits 0 from the repository root.
