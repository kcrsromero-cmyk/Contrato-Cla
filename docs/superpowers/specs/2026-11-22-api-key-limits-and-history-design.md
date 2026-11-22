# API key limit, rebranded prefix, and revoked-key history

## Intent / why

Three follow-ups to the API keys feature, requested after using it: (1) nothing currently stops a user from creating unlimited keys, (2) the key prefix (`ck_live_`) copies Stripe's convention instead of being Contrata360's own, (3) revoked keys pile up forever in the same list as active ones with no way to separate them.

## Goals

- **Cap:** a user may have at most **10 active (non-revoked) API keys**. Revoked keys never count against the cap — a user who revokes keys can always create new ones, which is the whole point of letting them rotate.
- **Prefix:** replace `ck_live_` with a **fixed** prefix, **`ctr360_`**, for every key (not shuffled per key — see Approaches). The rest of the key (32 random bytes, base64url) is unchanged.
- **History:** inside the existing "API" tab, a toggle between **"Activas"** (default; only non-revoked, with the "Revocar" button, exactly as today) and **"Historial"** (revoked keys only, read-only — name, prefix, created, revoked date, no actions). No new top-level tab in the profile modal.

## Non-goals

- No hard-delete of revoked rows (audit trail stays forever, as already designed).
- No per-user-configurable limit (10 is a fixed constant, not a plan-based quota — all plans that can create keys get the same cap).
- No automatic migration/rotation flow for already-issued `ck_live_...` keys — see Constraints.

## Constraints

- **Breaking change, accepted knowingly:** changing `API_KEY_PREFIX` makes every already-issued `ck_live_...` key stop authenticating (`isApiKeyAuthorization` and `API_KEY_PATTERN` both hard-match the prefix). This feature has no production users yet, so this is acceptable now and would not be acceptable after a real customer holds a live key. The 7 test keys in the local dev DB need to be recreated after this ships.
- No new npm dependency.
- User-facing strings in Spanish, matching the existing modal's tone.
- Follow the established module layout (`domain/` → `application/` → `presentation/`) and test conventions already used by `ApiKeyService.ts` / `ApiKeyController.ts` / `ApiKeysTab.tsx`.

## Approaches

**Prefix: fixed vs. shuffled-per-key.** The user's original ask was a prefix built by shuffling the letters of "contrata360" differently for every key. Rejected: a shuffled prefix adds negligible entropy (the security already comes entirely from the 32 random bytes that follow) while losing the one real benefit of a fixed prefix — letting a human, a log scanner, or an automated secret-scanning tool recognize "this is a Contrata360 key" on sight, the same reason Stripe uses `sk_live_` and GitHub uses `ghp_`. Agreed instead: one fixed prefix, `ctr360_`.

**History: new tab vs. toggle inside the existing API tab.** A fifth top-level tab was rejected — the profile modal's tab bar already holds 4 tabs in a `max-w-md` modal, and a prior code review flagged it as possibly cramped on narrow phones before this change even adds a fifth. A toggle inside the existing "API" tab content keeps the tab bar as-is and matches how similar List/Archive splits are usually done in this app's own style (segmented control, not navigation).

**Limit enforcement point: service layer vs. controller vs. DB constraint.** Enforced in `ApiKeyService.issue()` (application layer), mirroring exactly how `authenticate()` already enforces `USE_API` there rather than in the controller — keeps one place responsible for every business rule around issuing a key, and keeps `ApiKeyController` a thin HTTP-mapping layer as it already is.

## Data model / contracts touched

- `backend/src/modules/identity/domain/ApiKey.ts`: `API_KEY_PREFIX` changes from `'ck_live_'` to `'ctr360_'`; `API_KEY_PATTERN` changes to match (`/^ctr360_[A-Za-z0-9_-]{43}$/`).
- `backend/src/modules/identity/domain/errors.ts`: new `ApiKeyLimitExceededError` (`code: 'API_KEY_LIMIT_EXCEEDED'`, message `'Alcanzaste el máximo de 10 claves de API activas. Revoca una existente antes de crear otra.'`).
- `backend/src/modules/identity/application/ApiKeyService.ts`: new exported constant `MAX_ACTIVE_API_KEYS_PER_USER = 10`; `issue()` counts `apiKey.count({ where: { userId, revokedAt: null } })` before generating and throws the new error at/above the cap.
- `backend/src/modules/identity/presentation/ApiKeyController.ts`: `create()` catches `ApiKeyLimitExceededError` → 409 `{ error: error.message, code: error.code }` (same pattern as the existing `ApiKeyNotFoundError` → 404 branch).
- Frontend `frontend/src/services/api.ts`: no signature changes — `createApiKey` already surfaces `errorData.error` verbatim for any non-ok response, which covers the new 409 for free.
- Frontend `frontend/src/components/ApiKeysTab.tsx`: split the single key list into active vs. revoked (`keys.filter(k => !k.revokedAt)` / `keys.filter(k => k.revokedAt)`), a small segmented toggle control, and disable/hide the create form (or show a clear inline notice) when the active count is already 10 — this is a client-side convenience; the server remains the real enforcement point.

## Left to the builder

- Exact Tailwind markup for the "Activas / Historial" toggle (reuse the modal's existing segmented/tab visual language).
- Exact wording for the "cap reached" inline notice on the create form (Spanish, matching the rest of the tab's copy).
