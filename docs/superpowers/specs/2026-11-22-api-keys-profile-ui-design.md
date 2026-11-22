# API Keys — Profile Modal UI

## Intent / why

Today the only way to create an API key is `curl`/Postman against `POST /api/v1/auth/api-keys`. BUSINESS/ENTERPRISE users need to self-serve this from the app; other plans should see it exists, as an upgrade incentive.

## Goals

- A new **"API"** tab in `frontend/src/components/ProfileModal.tsx`, alongside "Mi Plan / Mi Perfil / Notificaciones".
- Tab is **always visible** (approved option **(b)**).
  - User lacks `USE_API` (not in `capabilities`): show an upsell card (same pattern as the existing FREE/STARTER upsell block), no backend calls.
  - User has `USE_API`: full key-management UI.
- Key management UI:
  - **List**: name, `keyPrefix`, created date, last used, revoked state.
  - **Create**: name input + button. On success, show the full plaintext key **exactly once**, with a copy-to-clipboard button and an explicit warning that it will not be shown again; user must dismiss ("Ya la copié") before the panel hides and the list refreshes.
  - **Revoke**: per-key button with a confirmation step.
  - Empty state: "Aún no tienes claves de API."

## Non-goals

- Per-key usage/consumption dashboards, editable rate limits, or UI for an org sharing keys — none of this exists in the backend yet.
- Editing a key's name after creation (backend doesn't support it).

## Anti-goals

- Never store, log, or re-display the plaintext key after the user dismisses the one-time reveal panel.
- Never call the create/list/revoke endpoints when the user lacks `USE_API` (upsell state must not hit the backend).

## Constraints

- No new npm dependency (clipboard via `navigator.clipboard.writeText`).
- User-facing strings in Spanish, matching the existing modal's tone.
- Reuse the existing `fetch` + `localStorage` token pattern already in `frontend/src/services/api.ts` (see `updateProfile`, `getFavoriteEntities`).
- Reuse existing Tailwind conventions from `ProfileModal.tsx` (rounded-xl, slate/indigo/emerald palette, `dark:` variants, the existing upsell-card and inline-message patterns).
- `capabilities` (from `useAuth()`) is the single gating signal — `capabilities.includes('USE_API')`.

## Approaches considered

One sensible way: extend the existing modal/tab pattern already used for "Mi Plan"/"Notificaciones", rather than a new standalone page/route. The app has no concept of a dedicated settings page — everything account-related lives in this one modal — so a separate route would break that convention for no benefit. Rejected: a standalone `/settings/api-keys` page (inconsistent with the rest of the app, more routing/auth-guard plumbing for no real gain).

## Backend contracts consumed (already built, unchanged here)

- `POST /api/v1/auth/api-keys` `{ name }` → 201 `{ id, name, keyPrefix, createdAt, key }` (plaintext `key` only ever appears in this response).
- `GET /api/v1/auth/api-keys` → 200 `{ apiKeys: [{ id, name, keyPrefix, createdAt, lastUsedAt, revokedAt }] }` (no `key`/`keyHash` ever).
- `DELETE /api/v1/auth/api-keys/:id` → 200 `{ id, name, keyPrefix, createdAt, lastUsedAt, revokedAt }` (same summary shape, `revokedAt` now set) or 404 `{ error: 'Clave de API no encontrada.', code: 'API_KEY_NOT_FOUND' }`.
- All three also answer 429 `{ error: 'Demasiadas solicitudes de administración de claves de API. Intenta de nuevo en un minuto.' }` and 403 `{ error: 'Forbidden: Requires USE_API capability' }` per the existing rate limiter / capability check.

## Incidental fix

`ProfileModal.tsx`'s `planTiers` array (`['FREE', 'STARTER', 'PROFESIONAL', 'ENTERPRISE']`, used for notification-channel plan gating) is missing `'BUSINESS'`. Add it in its correct tier position (`FREE < STARTER < PROFESIONAL < BUSINESS < ENTERPRISE`) while touching this file.

## Left to the builder

- Exact Tailwind classes/spacing for the new tab content (match the existing tabs' look).
- Exact icon choices from `lucide-react` (already a dependency) for key/copy/revoke affordances.
- Exact copy wording for the upsell card and warnings, in the voice already used elsewhere in this modal.
