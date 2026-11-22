# API Keys Profile UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a BUSINESS/ENTERPRISE user create, list, and revoke their own API keys from a new "API" tab in the profile modal; show an upgrade upsell to everyone else.

**Architecture:** Three plain `fetch` wrapper functions added to the existing `frontend/src/services/api.ts` (same pattern as `updateProfile`/`getFavoriteEntities`), consumed by a new `ApiKeysTab.tsx` component mounted as a fourth tab inside the existing `ProfileModal.tsx`. No new routes, no new state management library, no new npm dependency.

**Tech Stack:** React 19 + TypeScript, Vite, Tailwind, `lucide-react` icons (already a dependency), Vitest for the service-layer tests.

**Spec:** `docs/superpowers/specs/2026-11-22-api-keys-profile-ui-design.md`

## Global Constraints

- No new npm dependency (clipboard via `navigator.clipboard.writeText`).
- User-facing strings in Spanish, matching the modal's existing tone.
- Token pattern: `localStorage.getItem('token')` + `Authorization: Bearer <token>` header, exactly like `updateProfile`/`getFavoriteEntities` in `frontend/src/services/api.ts`.
- Tailwind conventions: reuse `ProfileModal.tsx`'s existing rounded-xl/slate/indigo/emerald palette and `dark:` variants; reuse its existing inline-message pattern (`{type:'success'|'error', text:string}` box) and its existing upsell-card pattern (the FREE/STARTER block).
- Gating signal is exactly `capabilities.includes('USE_API')` from `useAuth()` — no other check.
- The upsell state must never call `listApiKeys`/`createApiKey`/`revokeApiKey`.
- Never persist or re-display the plaintext `key` after the user dismisses the one-time reveal.

## Review Focus

- A `DELETE` on a key that doesn't exist or belongs to someone else → backend 404 `{ error: 'Clave de API no encontrada.', code: 'API_KEY_NOT_FOUND' }` must surface that exact message to the user, not a generic one.
- Hitting the `apiKeysLimiter` (10 requests/min on `/auth/api-keys`) → backend 429 `{ error: 'Demasiadas solicitudes de administración de claves de API. Intenta de nuevo en un minuto.' }` must surface verbatim, since a user double-clicking "Crear" is a real path to this.
- A stale/cached session whose plan capabilities say `USE_API` but the server now disagrees → backend 403 `{ error: 'Forbidden: Requires USE_API capability' }` must surface that message rather than a generic fallback, so this doesn't look like a silent failure.
- An empty or whitespace-only key name → the "Crear" button must be disabled client-side (backend also rejects it with 400, but the UI should not rely on that round-trip).
- The plaintext key must never be retrievable again after creation: `ApiKeySummary` (what `listApiKeys`/`revokeApiKey` return) must have no `key`/`keyHash` field at the type level, so a later screen can't accidentally render one that was never there.

---

## Task 1: API key service functions

**Files:**
- Modify: `frontend/src/services/api.ts`
- Test: `frontend/src/services/__tests__/apiKeys.test.ts` (new)

**Interfaces:**
- Produces:
  - `interface ApiKeySummary { id: string; name: string; keyPrefix: string; createdAt: string; lastUsedAt: string | null; revokedAt: string | null; }`
  - `interface IssuedApiKey extends ApiKeySummary { key: string; }`
  - `listApiKeys(): Promise<ApiKeySummary[]>`
  - `createApiKey(name: string): Promise<IssuedApiKey>`
  - `revokeApiKey(id: string): Promise<ApiKeySummary>`

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/services/__tests__/apiKeys.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { listApiKeys, createApiKey, revokeApiKey } from '../api';

const jsonResponse = (body: unknown, ok = true, status = ok ? 200 : 400) => ({
  ok,
  status,
  json: async () => body,
});

describe('API key service functions', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', { getItem: vi.fn(() => 'fake-token') } as any);
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('listApiKeys sends the Authorization header and returns apiKeys', async () => {
    (fetch as any).mockResolvedValue(jsonResponse({ apiKeys: [{ id: '1', name: 'CI', keyPrefix: 'ck_live_AAAA', createdAt: '2026-01-01', lastUsedAt: null, revokedAt: null }] }));

    const result = await listApiKeys();

    expect(result).toEqual([{ id: '1', name: 'CI', keyPrefix: 'ck_live_AAAA', createdAt: '2026-01-01', lastUsedAt: null, revokedAt: null }]);
    const [url, options] = (fetch as any).mock.calls[0];
    expect(url).toContain('/auth/api-keys');
    expect(options.headers.Authorization).toBe('Bearer fake-token');
  });

  it('listApiKeys throws on a non-ok response', async () => {
    (fetch as any).mockResolvedValue(jsonResponse({ error: 'Forbidden: Requires USE_API capability' }, false, 403));

    await expect(listApiKeys()).rejects.toThrow('Forbidden: Requires USE_API capability');
  });

  it('createApiKey posts the trimmed-by-backend name and returns the issued key', async () => {
    const issued = { id: '1', name: 'CI', keyPrefix: 'ck_live_AAAA', createdAt: '2026-01-01', key: 'ck_live_xxx' };
    (fetch as any).mockResolvedValue(jsonResponse(issued, true, 201));

    const result = await createApiKey('CI');

    expect(result).toEqual(issued);
    const [url, options] = (fetch as any).mock.calls[0];
    expect(url).toContain('/auth/api-keys');
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toEqual({ name: 'CI' });
  });

  it('createApiKey surfaces the backend 429 message', async () => {
    (fetch as any).mockResolvedValue(jsonResponse({ error: 'Demasiadas solicitudes de administración de claves de API. Intenta de nuevo en un minuto.' }, false, 429));

    await expect(createApiKey('CI')).rejects.toThrow('Demasiadas solicitudes de administración de claves de API. Intenta de nuevo en un minuto.');
  });

  it('revokeApiKey sends DELETE to /auth/api-keys/:id and returns the summary', async () => {
    const summary = { id: '1', name: 'CI', keyPrefix: 'ck_live_AAAA', createdAt: '2026-01-01', lastUsedAt: null, revokedAt: '2026-01-02' };
    (fetch as any).mockResolvedValue(jsonResponse(summary));

    const result = await revokeApiKey('1');

    expect(result).toEqual(summary);
    const [url, options] = (fetch as any).mock.calls[0];
    expect(url).toContain('/auth/api-keys/1');
    expect(options.method).toBe('DELETE');
  });

  it('revokeApiKey surfaces the backend 404 message', async () => {
    (fetch as any).mockResolvedValue(jsonResponse({ error: 'Clave de API no encontrada.', code: 'API_KEY_NOT_FOUND' }, false, 404));

    await expect(revokeApiKey('missing')).rejects.toThrow('Clave de API no encontrada.');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/services/__tests__/apiKeys.test.ts`
Expected: FAIL — `listApiKeys`/`createApiKey`/`revokeApiKey` are not exported from `../api`.

- [ ] **Step 3: Implement the types and functions in `frontend/src/services/api.ts`**

Append after `addFavoriteEntity` (end of file), following the exact `fetch` + `localStorage` token pattern already used by `updateProfile`:

```ts
export interface ApiKeySummary {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

export interface IssuedApiKey extends ApiKeySummary {
  key: string;
}
```

`listApiKeys(): Promise<ApiKeySummary[]>` — `GET ${API_URL}/auth/api-keys` with `Authorization: Bearer <token>`; on `!res.ok`, read the JSON body and throw `new Error(errorData.error || 'Error al obtener las claves de API')`; on success, return `(await res.json()).apiKeys`.

`createApiKey(name: string): Promise<IssuedApiKey>` — `POST ${API_URL}/auth/api-keys` with `Content-Type: application/json` + `Authorization`, body `JSON.stringify({ name })`; on `!res.ok`, throw `new Error(errorData.error || 'Error al crear la clave de API')`; on success, return `res.json()`.

`revokeApiKey(id: string): Promise<ApiKeySummary>` — `DELETE ${API_URL}/auth/api-keys/${id}` with `Authorization`; on `!res.ok`, throw `new Error(errorData.error || 'Error al revocar la clave de API')`; on success, return `res.json()`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/services/__tests__/apiKeys.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Typecheck**

Run: `cd frontend && npm run lint` (this project's `tsc --noEmit`)
Expected: exit 0 — confirms `ApiKeySummary` has no `key`/`keyHash` field and `IssuedApiKey` is the only type that does.

- [ ] **Step 6: Commit**

```bash
cd /Users/kcrs/Proyectos/Contrata360/Contrato-Cla
git add frontend/src/services/api.ts frontend/src/services/__tests__/apiKeys.test.ts
git commit -m "Add frontend API key service functions (list/create/revoke)"
```

---

## Task 2: ApiKeysTab component + ProfileModal wiring

**Files:**
- Create: `frontend/src/components/ApiKeysTab.tsx`
- Modify: `frontend/src/components/ProfileModal.tsx`

**Interfaces:**
- Consumes: `listApiKeys()`, `createApiKey(name: string)`, `revokeApiKey(id: string)`, `ApiKeySummary`, `IssuedApiKey` from `../services/api` (Task 1).
- Consumes: `capabilities: string[]` from `useAuth()` (existing `AuthContext`).
- Produces: `export default function ApiKeysTab({ capabilities }: { capabilities: string[] })` — self-contained, no other prop needed (it calls the service functions itself, same as the rest of `ProfileModal`'s tabs call `updateProfile`/`getFavoriteEntities` directly).

This task has no automated test (no component-test precedent exists in this codebase — only `services/__tests__/db.test.ts` exists, service-layer only). Verification is manual, per the project's own rule for frontend changes: start the dev server and exercise the feature in a browser.

- [ ] **Step 1: Create `frontend/src/components/ApiKeysTab.tsx`**

Structure (follow `ProfileModal.tsx`'s existing visual language — `rounded-xl`, `slate`/`indigo`/`emerald` palette, `dark:` variants, the `{type:'success'|'error',text}` inline message box):

- If `!capabilities.includes('USE_API')`: render the upsell card only (same shape as `ProfileModal`'s existing FREE/STARTER block: bold headline + one line of copy + a CTA-style element — no button needed to anything real, since there's no plan-upgrade flow yet; reuse the existing "Ver planes" button if present, or a static call-to-action line). Do not call any service function in this branch.
- Else:
  - On mount (`useEffect`), call `listApiKeys()` into local state; show a loading state while pending and an error message (reusing the inline message pattern) if it rejects.
  - Empty state: "Aún no tienes claves de API." when the list is empty.
  - List: one row per key — `name`, `keyPrefix` (monospace), `createdAt` and `lastUsedAt` formatted with `toLocaleDateString('es-CO', { timeZone: 'America/Bogota', day: '2-digit', month: 'long', year: 'numeric' })` (same call `ProfileModal` already uses for `planExpiresAt`), a badge for `revokedAt` (e.g. "Revocada" vs "Activa"), and a "Revocar" button (disabled/hidden if already `revokedAt`) that asks for confirmation (a simple two-step button state — "Revocar" → "¿Confirmar?" — no new modal needed) before calling `revokeApiKey(id)` and refetching the list on success, showing an error message on failure.
  - Create form: a name `<input>` (`value`, `onChange`) + a "Crear clave" `<button>` disabled when `name.trim() === ''` or while a create request is in flight.
  - On successful `createApiKey`, store the returned `IssuedApiKey` (including its `key`) in a **local** state variable (e.g. `const [revealedKey, setRevealedKey] = useState<IssuedApiKey | null>(null)`) and render a one-time reveal panel: the full `key` in a monospace/selectable box, a "Copiar" button calling `navigator.clipboard.writeText(revealedKey.key)` (wrap in `try/catch`, show a brief "Copiado" confirmation), a clear warning that it will never be shown again, and a "Ya la copié" button that sets `revealedKey` back to `null` and refetches the list — this is the only place `key`/`revealedKey.key` is ever read; nothing persists it (no `localStorage`, no passing it elsewhere).

- [ ] **Step 2: Wire the tab into `frontend/src/components/ProfileModal.tsx`**

1. Import: `import ApiKeysTab from './ApiKeysTab';`
2. Widen the tab union type: `useState<'plan' | 'perfil' | 'notificaciones' | 'api'>('plan')`.
3. Add a fourth tab button after "Notificaciones", following the exact same className pattern as the other three buttons (active: `border-indigo-600 text-indigo-600 ...`; inactive: `border-transparent text-slate-500 ...`), labeled `API`.
4. Add a render branch: `{activeTab === 'api' && <ApiKeysTab capabilities={capabilities} />}` inside the existing scrollable content `<div>`.
5. Fix `planTiers` (used by the notification-channel gating logic): `['FREE', 'STARTER', 'PROFESIONAL', 'BUSINESS', 'ENTERPRISE']`.

- [ ] **Step 3: Start the dev server and verify manually in the browser**

Run: `cd /Users/kcrs/Proyectos/Contrata360/Contrato-Cla && docker compose up -d` (or `npm run dev` in `frontend/` against the already-running local backend).

Using the local test user already on plan `BUSINESS` (`kcrstest@test.com` / `qwerty123456`, per this session's earlier work):
- Open the profile modal, click the new "API" tab.
- Confirm the key list loads (it already has "Prueba Bruno" from this session's manual testing).
- Confirm "Crear clave" stays disabled with the name field empty or containing only spaces.
- Create a new key with a name; confirm the plaintext reveal panel shows the full `ck_live_...` value, the "Copiar" button copies it, and dismissing it ("Ya la copié") hides it and the list refreshes with the new entry — and that reopening the tab or modal never shows that plaintext again.
- Revoke a key; confirm its row updates to "Revocada" and it can no longer authenticate (optional: verify with the same `curl`/Bruno check used earlier in this session).
- Temporarily downgrade the same user's plan to `STARTER` in the local DB (`UPDATE users SET plan_id = (SELECT id FROM plans WHERE name = 'STARTER') WHERE email = 'kcrstest@test.com';`), reload, and confirm the "API" tab now shows the upsell card instead of the list — then restore the plan back to `BUSINESS` afterward.

Expected: all of the above behave as described, with no console errors.

- [ ] **Step 4: Typecheck**

Run: `cd frontend && npm run lint`
Expected: exit 0

- [ ] **Step 5: Commit**

```bash
cd /Users/kcrs/Proyectos/Contrata360/Contrato-Cla
git add frontend/src/components/ApiKeysTab.tsx frontend/src/components/ProfileModal.tsx
git commit -m "Add API keys tab to profile modal (create/list/revoke, upsell for non-BUSINESS plans)"
```
