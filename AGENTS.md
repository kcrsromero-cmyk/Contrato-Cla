# Contrata360 — agent instructions

Colombian public-procurement analytics: an Express + Prisma API and a BullMQ worker in `backend/`, deployed from the root `docker-compose.yml` through Coolify.

## Commands

Run from the repository root.

| Task | Command |
|---|---|
| Install | `(cd backend && npm ci)` |
| Prisma client | `(cd backend && npx prisma generate)` |
| Typecheck | `(cd backend && npx tsc --noEmit)` |
| Build | `(cd backend && npm run build)` |
| Tests | `(cd backend && npx vitest run)` · one module: `(cd backend && npx vitest run src/modules/notifications)` |
| Dev API | `(cd backend && npm run dev)` |

Active change: `blueprints/notifications-telegram-apprise/tasks.json` — pick the first ready task in array order.

## Non-negotiable

1. **Frozen:** `PATCH /api/v1/auth/profile` (its zod schema and behaviour), `CurrentUserResolver`'s selected fields, and the columns `telegram_username`, `notify_email`, `notify_telegram`, `notify_sms`. Do not edit `AuthController.ts` or `CurrentUserResolver.ts`.
2. **Migrations are additive and hand-authored.** Never edit an existing migration directory. Never run `prisma migrate dev`, `migrate reset` or `db push` against a shared database.
3. **Never log or return the Telegram bot token or an outbound request URL/body. Never log a link code or chat id, and never return either one except the caller's own freshly issued code in the POST /telegram/link-code response.**
4. **Every env var goes through `EnvSchema`** and both `.env.example` files. Wire it into compose for every service that reads it.
5. Never commit secrets, `.env`, or `dist/`.
6. Never mark a task done with a failing verify command, and never edit a verify command to make it pass.

Full architecture, layer boundaries and conventions: see `CLAUDE.md` in this directory.
