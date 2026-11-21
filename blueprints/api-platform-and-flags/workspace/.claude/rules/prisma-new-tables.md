---
description: New tables, foreign keys and seed edits
paths:
  - "backend/prisma/**"
---

# New tables, foreign keys and seed edits

- New tables use `CREATE TABLE IF NOT EXISTS`. `NOT NULL` is allowed inside a new table (it has no rows); on an existing table only nullable `ADD COLUMN IF NOT EXISTS`.
- Postgres 15 has no `ADD CONSTRAINT IF NOT EXISTS`: add foreign keys inside `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '<name>') THEN ALTER TABLE … ADD CONSTRAINT …; END IF; END $$;`.
- Prisma names: `<table>_pkey`, `<table>_<column>_key` (unique), `<table>_<column>_idx` (`@@index`), `<table>_<column>_fkey`. `@default(uuid())` has no DB default; `@updatedAt` columns are `NOT NULL` with no DB default.
- `backend/prisma/seed.ts` edits are insertions only: new array entries, new fetch lines, new `planCapabilities.push` lines, new blocks. Never change an existing line, so `git diff -U0` shows no removed line.
- Feature-flag upserts use `update: {}`. Values for rows that already exist in production (like a new column on `ENTERPRISE`) are set with `plan.update`, not by editing the existing upsert.
- The seed runs `main()` at import. Its gate is `backend/src/__tests__/seed.test.ts` (mocked `PrismaClient`) plus the standalone strict `tsc` on `prisma/seed.ts`. `migrator` never runs it; operators run `npx prisma db seed` after deploy.
