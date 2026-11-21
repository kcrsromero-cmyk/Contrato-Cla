---
description: Notifications module conventions (Notifier port, Apprise adapter, Telegram link gateway)
paths:
  - "backend/src/modules/notifications/**"
---

# Notifications module

- Layout mirrors `backend/src/modules/identity/`: `domain/` (port, errors, link-code constants) → `application/NotificationService.ts` → `infrastructure/` (`NotifierRegistry`, `AppriseNotifier`, `TelegramLinkGateway`) → `presentation/` (`routes.ts`, `NotificationsController.ts`, `NotificationSchemas.ts`).
- `Notifier.send(recipient, message, title?)` is the only port. `recipient` is channel-specific: for Telegram it is the chat id as a decimal string.
- `NotifierRegistry` default name is `apprise`. `routes.ts` registers adapters, and `NotificationService` resolves them at call time.
- `TelegramLinkGateway` is NOT a `Notifier` and is never registered. It runs only in `worker.ts`, never in the API process: Telegram allows one `getUpdates` consumer per token.
- Only `presentation/routes.ts` imports `config`. Adapters and the gateway take `baseUrl` / `botToken` through constructor options.
- Apprise call: `POST ${baseUrl without trailing slashes}/notify/`, JSON `{ urls: "tgram://<token>/<chatId>", body, title }`. Any non-2xx or rejected fetch → `NotificationDeliveryError` (with `status` when known).
- Validate the chat id against `^-?\d+$` before building the `tgram://` URL.
- Link codes: 8 chars from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`, TTL 15 minutes, single use (cleared on link), latest issued code wins. Prisma `P2002` on issue → retry, 3 attempts in total.
- `/start <code>` and `/start@BotName <code>` are accepted. The code is upper-cased, then checked against `^[A-HJ-NP-Z2-9]{8}$` before any query.
- `getUpdates` offset = last `update_id` + 1, advanced even when handling one update throws.
- HTTP mapping: `NotificationChannelNotLinkedError` → 409 `{ error, code: reason }`. `NotificationDeliveryError` → 502 `{ error, code: 'DELIVERY_FAILED' }`. No `req.user` → 401 `{ error: 'Unauthorized' }`. Anything else → 500 `{ error: 'Internal Server Error' }`.
- Never log or return the bot token or an outbound URL/body. Never log a link code or chat id, and never return either one except the caller's own freshly issued code in the POST /telegram/link-code response. Log `userId`, HTTP status, and `error.message` of errors this module created.
- Out of scope, do not build: email/SMS adapters, event-triggered notifications, `setWebhook`, bot reply messages, unlink endpoint.
