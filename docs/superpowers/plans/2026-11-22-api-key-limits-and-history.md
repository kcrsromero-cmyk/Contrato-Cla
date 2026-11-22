# API Key Limit, Rebranded Prefix, and History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cap every user at 10 active API keys, rebrand the key prefix from `ck_live_` to the fixed `ctr360_`, and let the user see revoked keys in a separate read-only history view instead of mixed into the active list.

**Architecture:** The cap is enforced once, in `ApiKeyService.issue()` (same layer that already enforces the `USE_API` capability), with a new typed error the controller maps to HTTP 409. The prefix change is a single domain-constant edit that mechanically propagates through every test asserting the literal string. The history view is a client-side split of the same `listForUser()` result the tab already fetches — no new endpoint.

**Tech Stack:** Same as the existing API-key feature — Express 4, TypeScript, Prisma, vitest (backend); React 19 + TypeScript, Tailwind (frontend). No new dependency anywhere.

**Spec:** `docs/superpowers/specs/2026-11-22-api-key-limits-and-history-design.md`

## Global Constraints

- No new npm dependency.
- User-facing strings in Spanish, matching the existing tab's tone.
- The cap counts **active** keys only (`revokedAt: null`) — revoked keys never count against it.
- The new prefix, `ctr360_`, is **fixed** for every key — never shuffled or per-key varied.
- Follow this module's existing layout and test conventions exactly: `domain/` → `application/` → `presentation/`; vitest with `vi.fn()` fakes, no real DB/network in any test.
- **Accepted breaking change:** every already-issued `ck_live_...` key (including the 7 in the local dev DB) stops authenticating once `API_KEY_PREFIX` changes — there is no migration path, by design, because nothing in production depends on the old format yet.

## Review Focus

- A user with exactly 9 active keys must still be allowed to create a 10th; a user with exactly 10 must be blocked on the 11th attempt — get the boundary (`>=` vs `>`) right.
- A user at the 10-key cap who revokes one key must be able to immediately create a replacement — the count must only ever include `revokedAt: null` rows.
- The new 409 must be mapped explicitly in `ApiKeyController.create()`, the same way `ApiKeyNotFoundError` already is — it must never fall through to the generic 500 `fail()` branch.
- An already-issued `ck_live_...` key, presented after this ships, must fail cleanly as 401 `INVALID_API_KEY` (the existing "malformed key" path `API_KEY_PATTERN.test()` already covers this with no new code) — not throw or 500.
- The frontend's client-side "disable at 10" is a convenience only; if the request reaches the server anyway, the 409 body must still surface through `createApiKey`'s existing generic error-surfacing (no special-casing required, but worth confirming nothing broke it).

---

## Task 1: Rebrand the key prefix

**Files:**
- Modify: `backend/src/modules/identity/domain/ApiKey.ts`
- Modify (literal `ck_live_` → `ctr360_`, mechanical, every occurrence): `backend/src/modules/identity/__tests__/ApiKey.test.ts`, `backend/src/modules/identity/__tests__/ApiKeyService.test.ts`, `backend/src/modules/identity/__tests__/ApiKeyServiceManagement.test.ts`, `backend/src/modules/identity/__tests__/ApiKeyController.test.ts`, `backend/src/modules/identity/__tests__/ApiKeyAuthMiddleware.test.ts`, `backend/src/modules/identity/__tests__/ApiKeyRoutes.test.ts`, `backend/src/modules/identity/__tests__/authenticateApiKeyOrSession.test.ts`, `backend/src/modules/procurement/__tests__/ProcurementApiKeyRoutes.test.ts`, `backend/src/modules/analytics/__tests__/AnalyticsRoutes.test.ts`
- Modify (doc-comment text only, no behavior change): `backend/src/modules/identity/presentation/authenticateApiKeyOrSession.ts`, `backend/src/modules/identity/presentation/ApiKeyAuthMiddleware.ts`
- Modify (seed description string, cosmetic): `backend/prisma/seed.ts`

**Interfaces:**
- Unchanged signatures — `API_KEY_PREFIX: string`, `API_KEY_PATTERN: RegExp`, `generateApiKey()`, `isApiKeyAuthorization()` all keep their existing shapes. Only the literal values change.

- [ ] **Step 1: Confirm every current occurrence of the literal `ck_live_`**

Run: `cd /Users/kcrs/Proyectos/Contrata360/Contrato-Cla && grep -rn "ck_live_" backend/src backend/prisma/seed.ts frontend/src`
Expected: a list matching exactly the files named above (plus `frontend/src/services/__tests__/apiKeys.test.ts`, which is **out of scope for this task** — it only compares mocked API responses by field name, never asserts the literal prefix text, so it needs no change; confirm this by reading it before skipping it).

- [ ] **Step 2: Edit `backend/src/modules/identity/domain/ApiKey.ts`**

```ts
export const API_KEY_PREFIX = 'ctr360_';
export const API_KEY_PATTERN = /^ctr360_[A-Za-z0-9_-]{43}$/;
```

- [ ] **Step 3: Update every test file listed above**

Replace every literal `ck_live_` with `ctr360_`, character-for-character (e.g. `'ck_live_' + 'A'.repeat(43)` → `'ctr360_' + 'A'.repeat(43)`; `'Bearer ck_live_abc'` → `'Bearer ctr360_abc'`; `plaintext.startsWith('ck_live_')` → `plaintext.startsWith('ctr360_')`; mock `keyPrefix` fixtures like `'ck_live_AAAA'` → `'ctr360_AAAA'`). Do not change anything else in these files — this is a pure literal substitution, same count of characters is not required since `ctr360_` and `ck_live_` differ in length (7 vs 8 chars); the `43`-char random suffix length is unaffected either way since the pattern only anchors the prefix text itself.

- [ ] **Step 4: Update the two doc-comment-only mentions and the seed description**

`authenticateApiKeyOrSession.ts`'s and `ApiKeyAuthMiddleware.ts`'s comments: `` `Authorization: Bearer ck_live_…` `` → `` `Authorization: Bearer ctr360_…` ``. `backend/prisma/seed.ts`'s `API_ACCESS` flag description: `'Autenticación con claves de API (Authorization: Bearer ck_live_)'` → `'Autenticación con claves de API (Authorization: Bearer ctr360_)'`.

- [ ] **Step 5: Run every affected test file**

Run:
```bash
cd backend && npx vitest run \
  src/modules/identity/__tests__/ApiKey.test.ts \
  src/modules/identity/__tests__/ApiKeyService.test.ts \
  src/modules/identity/__tests__/ApiKeyServiceManagement.test.ts \
  src/modules/identity/__tests__/ApiKeyController.test.ts \
  src/modules/identity/__tests__/ApiKeyAuthMiddleware.test.ts \
  src/modules/identity/__tests__/ApiKeyRoutes.test.ts \
  src/modules/identity/__tests__/authenticateApiKeyOrSession.test.ts \
  src/modules/procurement/__tests__/ProcurementApiKeyRoutes.test.ts \
  src/modules/analytics/__tests__/AnalyticsRoutes.test.ts
```
Expected: all 9 files pass, 107 tests total (the current count, confirmed before this task started) — this count must not change, since only string literals inside them are being edited, not behavior.

- [ ] **Step 6: Typecheck**

Run: `cd backend && npx tsc --noEmit`
Expected: exit 0

- [ ] **Step 7: Commit**

```bash
cd /Users/kcrs/Proyectos/Contrata360/Contrato-Cla
git add backend/src/modules/identity/domain/ApiKey.ts backend/src/modules/identity/__tests__/ApiKey.test.ts backend/src/modules/identity/__tests__/ApiKeyService.test.ts backend/src/modules/identity/__tests__/ApiKeyServiceManagement.test.ts backend/src/modules/identity/__tests__/ApiKeyController.test.ts backend/src/modules/identity/__tests__/ApiKeyAuthMiddleware.test.ts backend/src/modules/identity/__tests__/ApiKeyRoutes.test.ts backend/src/modules/identity/__tests__/authenticateApiKeyOrSession.test.ts backend/src/modules/procurement/__tests__/ProcurementApiKeyRoutes.test.ts backend/src/modules/analytics/__tests__/AnalyticsRoutes.test.ts backend/src/modules/identity/presentation/authenticateApiKeyOrSession.ts backend/src/modules/identity/presentation/ApiKeyAuthMiddleware.ts backend/prisma/seed.ts
git commit -m "Rebrand API key prefix from ck_live_ to ctr360_"
```

---

## Task 2: Cap active API keys at 10

**Files:**
- Modify: `backend/src/modules/identity/domain/errors.ts`
- Modify: `backend/src/modules/identity/application/ApiKeyService.ts`
- Modify: `backend/src/modules/identity/presentation/ApiKeyController.ts`
- Modify (add test coverage): `backend/src/modules/identity/__tests__/ApiKey.test.ts`, `backend/src/modules/identity/__tests__/ApiKeyServiceManagement.test.ts`, `backend/src/modules/identity/__tests__/ApiKeyController.test.ts`

**Interfaces:**
- Consumes: nothing new from Task 1 beyond the renamed constants (already in place).
- Produces: `ApiKeyLimitExceededError` (`domain/errors.ts`, `code: 'API_KEY_LIMIT_EXCEEDED'`); `MAX_ACTIVE_API_KEYS_PER_USER = 10` (exported from `application/ApiKeyService.ts`, alongside the existing `USE_API_CAPABILITY` export).

- [ ] **Step 1: Write the failing tests**

In `backend/src/modules/identity/__tests__/ApiKey.test.ts`, inside the existing `describe('typed API key errors', ...)` block, add:
```ts
it('ApiKeyLimitExceededError exposes the expected code and name', () => {
  const error = new ApiKeyLimitExceededError();
  expect(error).toBeInstanceOf(Error);
  expect(error.name).toBe('ApiKeyLimitExceededError');
  expect(error.code).toBe('API_KEY_LIMIT_EXCEEDED');
  expect(error.message.length).toBeGreaterThan(0);
});
```
Add `ApiKeyLimitExceededError` to that file's existing import from `'../domain/errors'`.

In `backend/src/modules/identity/__tests__/ApiKeyServiceManagement.test.ts`:
1. Add `count: vi.fn()` to `buildClient()`'s `apiKey` object (it currently has `create`, `findMany`, `findFirst`, `update` only).
2. Add a default `client.apiKey.count.mockResolvedValue(0)` inside the existing `describe('ApiKeyService.issue', ...)` test, before calling `service.issue(...)`, so the existing "creates the key..." test keeps passing unchanged (0 existing active keys, well under the cap).
3. Add two new tests in that same `describe` block:

```ts
it('queries the active-key count by userId before issuing', async () => {
  const client = buildClient();
  client.apiKey.count.mockResolvedValue(3);
  client.apiKey.create.mockImplementation(async ({ data }: any) => ({
    id: 'key-1', name: 'CI', keyPrefix: data.keyPrefix, createdAt: NOW,
  }));
  const service = new ApiKeyService(client as any, () => NOW);

  await service.issue('user-1', 'CI');

  expect(client.apiKey.count).toHaveBeenCalledWith({ where: { userId: 'user-1', revokedAt: null } });
});

it('throws ApiKeyLimitExceededError at exactly 10 active keys, without calling create', async () => {
  const client = buildClient();
  client.apiKey.count.mockResolvedValue(10);
  const service = new ApiKeyService(client as any, () => NOW);

  await expect(service.issue('user-1', 'CI')).rejects.toBeInstanceOf(ApiKeyLimitExceededError);
  expect(client.apiKey.create).not.toHaveBeenCalled();
});

it('still allows issuing at 9 active keys', async () => {
  const client = buildClient();
  client.apiKey.count.mockResolvedValue(9);
  client.apiKey.create.mockImplementation(async ({ data }: any) => ({
    id: 'key-1', name: 'CI', keyPrefix: data.keyPrefix, createdAt: NOW,
  }));
  const service = new ApiKeyService(client as any, () => NOW);

  await expect(service.issue('user-1', 'CI')).resolves.toBeDefined();
});
```
Add `ApiKeyLimitExceededError` to this file's import from `'../domain/errors'` (it currently imports only `ApiKeyNotFoundError`).

In `backend/src/modules/identity/__tests__/ApiKeyController.test.ts`, inside the existing `describe('create', ...)` block, add:
```ts
it('responds 409 when the service throws ApiKeyLimitExceededError', async () => {
  const controller = new ApiKeyController(manager);
  manager.issue.mockRejectedValue(new ApiKeyLimitExceededError());
  const req: any = { user: { id: 'user-1' }, body: { name: 'ERP' } };

  await controller.create(req, res);

  expect(res.status).toHaveBeenCalledWith(409);
  expect(res.json).toHaveBeenCalledWith({
    error: 'Alcanzaste el máximo de 10 claves de API activas. Revoca una existente antes de crear otra.',
    code: 'API_KEY_LIMIT_EXCEEDED',
  });
});
```
Add `ApiKeyLimitExceededError` to this file's import from `'../domain/errors'`.

- [ ] **Step 2: Run tests to verify they fail**

Run:
```bash
cd backend && npx vitest run \
  src/modules/identity/__tests__/ApiKey.test.ts \
  src/modules/identity/__tests__/ApiKeyServiceManagement.test.ts \
  src/modules/identity/__tests__/ApiKeyController.test.ts
```
Expected: FAIL — `ApiKeyLimitExceededError` is not exported from `../domain/errors`, and `client.apiKey.count` does not exist on the existing `buildClient()` fakes.

- [ ] **Step 3: Implement `ApiKeyLimitExceededError` in `backend/src/modules/identity/domain/errors.ts`**

Add, following the exact shape of the three existing error classes in this file:
```ts
export class ApiKeyLimitExceededError extends Error {
  readonly name = 'ApiKeyLimitExceededError';
  readonly code = 'API_KEY_LIMIT_EXCEEDED';

  constructor() {
    super('Alcanzaste el máximo de 10 claves de API activas. Revoca una existente antes de crear otra.');
  }
}
```

- [ ] **Step 4: Implement the cap in `backend/src/modules/identity/application/ApiKeyService.ts`**

Add `export const MAX_ACTIVE_API_KEYS_PER_USER = 10;` next to the existing `export const USE_API_CAPABILITY = 'USE_API';`. Add `ApiKeyLimitExceededError` to the existing import from `'../domain/errors'`. At the top of `issue(userId: string, name: string)`, before calling `generateApiKey()`:
```ts
const activeCount = await this.prisma.apiKey.count({ where: { userId, revokedAt: null } });
if (activeCount >= MAX_ACTIVE_API_KEYS_PER_USER) throw new ApiKeyLimitExceededError();
```
`ApiKeyClient` (`Pick<PrismaClient, 'apiKey' | 'plan'>`) already exposes `apiKey.count` through the full Prisma delegate type — no type change needed there.

- [ ] **Step 5: Map the error in `backend/src/modules/identity/presentation/ApiKeyController.ts`**

Add `ApiKeyLimitExceededError` to the existing import from `'../domain/errors'`. In `create()`'s catch block, before the call to `this.fail(...)`:
```ts
if (error instanceof ApiKeyLimitExceededError) {
  return res.status(409).json({ error: error.message, code: error.code });
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run:
```bash
cd backend && npx vitest run \
  src/modules/identity/__tests__/ApiKey.test.ts \
  src/modules/identity/__tests__/ApiKeyServiceManagement.test.ts \
  src/modules/identity/__tests__/ApiKeyController.test.ts \
  src/modules/identity/__tests__/ApiKeyService.test.ts
```
Expected: PASS, all files (the last one re-run because it shares `ApiKeyService` and must not have regressed).

- [ ] **Step 7: Typecheck**

Run: `cd backend && npx tsc --noEmit`
Expected: exit 0

- [ ] **Step 8: Commit**

```bash
cd /Users/kcrs/Proyectos/Contrata360/Contrato-Cla
git add backend/src/modules/identity/domain/errors.ts backend/src/modules/identity/application/ApiKeyService.ts backend/src/modules/identity/presentation/ApiKeyController.ts backend/src/modules/identity/__tests__/ApiKey.test.ts backend/src/modules/identity/__tests__/ApiKeyServiceManagement.test.ts backend/src/modules/identity/__tests__/ApiKeyController.test.ts
git commit -m "Cap active API keys at 10 per user"
```

---

## Task 3: Split the frontend into Activas / Historial and surface the cap

**Files:**
- Modify: `frontend/src/components/ApiKeysTab.tsx`

**Interfaces:**
- Consumes: no new backend contract — `listApiKeys()` already returns every key (active and revoked) in one array; this task only changes how the existing array is rendered. The 409 body `{ error, code: 'API_KEY_LIMIT_EXCEEDED' }` already surfaces through `createApiKey`'s existing `errorData.error` fallback (Task 1 of the original API-keys-profile-ui plan) — no change needed in `services/api.ts`.
- Produces: no new exports — this is a self-contained UI change within the existing `ApiKeysTab` component.

This task has no automated test, for the same reason Task 2 of the original `2026-11-22-api-keys-profile-ui.md` plan had none: no component-test environment (jsdom/happy-dom) exists in this codebase. Verification is manual, in the browser, against the locally running stack — see Step 2.

- [ ] **Step 1: Edit `frontend/src/components/ApiKeysTab.tsx`**

1. Add `const [view, setView] = useState<'activas' | 'historial'>('activas');` near the other `useState` calls.
2. Split the fetched list: `const activeKeys = keys.filter((k) => !k.revokedAt);` and `const revokedKeys = keys.filter((k) => k.revokedAt);`.
3. Add a small two-button segmented toggle ("Activas" / "Historial") above the key list, following the component's existing badge/button Tailwind style (`rounded-lg`, `text-xs font-bold`, active vs inactive color pair like the existing "Revocar"/"¿Confirmar?" button states). Clicking a button sets `view`.
4. The create form (name input + "Crear clave" button) and its one-time reveal panel stay exactly as they are, but only render while `view === 'activas'`.
5. When `view === 'activas'`: render `activeKeys` (reusing the existing per-row markup, loading/error states unchanged) with the existing empty-state message "Aún no tienes claves de API." shown only when `activeKeys.length === 0`.
6. When `view === 'historial'`: render `revokedKeys` with the same per-row markup (the revoke button already only renders `{!isRevoked && (...)}`, so no markup change is needed there — revoked rows never show an action button today). Add an empty-state message "No tienes claves revocadas." shown when `revokedKeys.length === 0`.
7. Surface the cap: when `activeKeys.length >= 10` and `view === 'activas'`, replace the create `<form>` with an inline notice (reuse the existing red error-box Tailwind classes) reading "Alcanzaste el máximo de 10 claves de API activas. Revoca una existente para crear otra." — the list of active keys stays visible underneath so the user can revoke one.

- [ ] **Step 2: Rebuild and verify manually in the browser**

Run:
```bash
cd /Users/kcrs/Proyectos/Contrata360/Contrato-Cla && docker compose build backend worker frontend && docker compose up -d backend worker frontend
```

Then, against the local test user (`kcrstest@test.com` / `qwerty123456`, plan `BUSINESS`):
- In the local DB, revoke the 3 currently-active old-format keys so none linger as unusable-but-"Activa": `docker exec contrata360_db psql -U contrata360_local -d contrata360_local -c "UPDATE api_keys SET revoked_at = now() WHERE revoked_at IS NULL;"`.
- Log in, open the API tab. Confirm it defaults to "Activas", shows the empty state (no active keys left), and "Historial" shows all 7 old keys (including the 3 just revoked) with no action buttons.
- Create a new key. Confirm the issued plaintext now starts with `ctr360_`, not `ck_live_`.
- Confirm the new key authenticates against the real backend (`curl` or Bruno, same as earlier in this session): `GET /api/v1/analytics/contracts/by-status` with `Authorization: Bearer <new key>` → 200.
- Confirm an **old** key no longer authenticates cleanly: `curl` the same endpoint with one of the old `ck_live_...` plaintexts (if still recorded in this session's earlier messages) → 401 `code: 'INVALID_API_KEY'`, not a 500.
- Create active keys up to 10 total (script a loop of `createApiKey` calls via the browser or curl against `POST /auth/api-keys` with the session token, naming them e.g. `Test 1`..`Test 10`). Confirm the 10th succeeds, the 11th is blocked client-side (form replaced by the inline cap notice) and, if sent directly via curl bypassing the UI, the backend answers 409 with the exact cap message.
- Revoke one of the 10 active keys. Confirm the cap notice disappears and the create form reappears (9 active keys again).

Expected: all of the above behave as described, with no console errors.

- [ ] **Step 3: Typecheck**

Run: `cd frontend && npm run lint`
Expected: exit 0

- [ ] **Step 4: Commit**

```bash
cd /Users/kcrs/Proyectos/Contrata360/Contrato-Cla
git add frontend/src/components/ApiKeysTab.tsx
git commit -m "Split API keys into Activas/Historial and surface the 10-key cap"
```
