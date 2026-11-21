---
name: add-notifier-adapter
description: Add a new notification channel adapter (email, SMS, another chat app) behind the Notifier port in backend/src/modules/notifications. Use when asked to "add an email notifier", "add SMS notifications", "new notification channel" or "register another Notifier".
---

# Add a Notifier adapter

## When to use

- A new delivery channel must sit beside `AppriseNotifier` without changing `NotificationService` or the routes.
- Do not use it for recipient discovery flows like `TelegramLinkGateway`. Those are not `Notifier`s.

## Steps

1. Read `backend/src/modules/notifications/domain/Notifier.ts` and `infrastructure/AppriseNotifier.ts`. The new adapter has the same shape.
2. Create `backend/src/modules/notifications/infrastructure/<Name>Notifier.ts`:
   - `implements Notifier`
   - `constructor(options: <Name>NotifierOptions)` — never import `config`
   - throw `NotificationDeliveryError` on any failed delivery
   - never log the recipient, the body, or credentials
3. If the channel needs configuration, add each key through `.claude/rules/env-config.md`: `EnvSchema`, both `.env.example` files, and the compose services.
4. Register it in `backend/src/modules/notifications/presentation/routes.ts`, next to the existing line: `NotifierRegistry.register('<name>', new <Name>Notifier({ … config values … }))`. Changing the default name in `NotifierRegistry` is a product decision. Do not change it unless asked.
5. Write `backend/src/modules/notifications/__tests__/<Name>Notifier.test.ts` with `fetch` stubbed (`vi.stubGlobal`). Cover the happy-path request shape, a non-2xx response, a rejected `fetch`, and an invalid recipient.
6. If the user's opt-in flag for the channel (`notifyEmail`, `notifySms`) must be enforced, that is a `NotificationService` change with its own tests. Do not fold it into the adapter.

## Verify

```bash
(cd backend && npx vitest run src/modules/notifications)   # expect: exit 0, 0 failed
(cd backend && npx tsc --noEmit)                           # expect: exit 0
(cd backend && npm run build)                              # expect: exit 0
```

## Do not

- Import `backend/src/infrastructure/config/env.ts` from the adapter. It exits the process at import in tests without a full environment.
- Add an npm SDK when one `fetch` call does the job.
- Touch `PATCH /api/v1/auth/profile`, `AuthController.ts` or `CurrentUserResolver.ts`. They are frozen.
