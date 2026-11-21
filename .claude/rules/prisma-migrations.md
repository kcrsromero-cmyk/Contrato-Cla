---
description: Prisma schema and migration conventions
paths:
  - "backend/prisma/**"
---

# Prisma schema and migrations

- `backend/prisma/schema.prisma` is the source of truth. Table names use `@@map` (`users`, …), and columns use `@map("snake_case")`.
- Migrations in this repo are hand-authored: a new directory `YYYYMMDDHHMMSS_<snake_name>/migration.sql`, with a timestamp later than every existing directory, and SQL in the `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS …` style.
- Additive only in a change that ships with code: new nullable columns, new indexes. No `DROP`, no `NOT NULL` on existing rows, no `ALTER COLUMN` in the same deploy as the code that needs it.
- Index names follow Prisma's convention so `schema.prisma` and the database never drift: `<table>_<column>_key` for `@unique`.
- After editing the schema, run `(cd backend && npx prisma generate)`. It needs no database.
- Never edit an existing migration directory. Prisma checksums applied migrations.
- Production applies migrations only through the `migrator` compose service (`sh scripts/migrate.sh` → `npx prisma migrate deploy`). Never run `migrate dev`, `migrate reset`, `db push` or `migrate deploy` from an agent session.
- Frozen columns: `telegram_username`, `notify_email`, `notify_telegram`, `notify_sms`.
