---
description: Backend vitest conventions
paths:
  - "backend/src/**/__tests__/**"
---

# Backend tests (vitest 4, no config file)

- Tests live in `__tests__/` beside the module they test, named `<Subject>.test.ts`. `tsconfig.json` excludes them from `tsc`.
- Run one file: `(cd backend && npx vitest run <path from backend/>)`. A path that matches no file exits 1 with "No test files found".
- `backend/src/infrastructure/config/env.ts` validates at import and calls `process.exit(1)`. Any test whose import graph reaches it must either `vi.mock('<relative path>/infrastructure/config/env', () => ({ config: { … } }))` or set every required `process.env` key itself, with `dotenv` mocked.
- Mock `backend/src/infrastructure/db/prisma` with a `vi.fn()` object (`{ prisma: { user: { … } } }`), as `identity/__tests__/UpdateProfile.test.ts` does. No test touches a real database, Redis, Apprise or the network.
- Outbound HTTP: inject `fetchImpl` or use `vi.stubGlobal('fetch', vi.fn())`, with `vi.unstubAllGlobals()` in `afterEach`.
- vitest 4: a mock invoked with `new` needs a `class` (or `function`) implementation. Arrow-function implementations throw "is not a constructor".
- `vi.mock` factories are hoisted. Use `vi.hoisted(() => …)` for shared state, never an outer `const`.
- Static registries keep state across tests in one file. Use `vi.resetModules()` and `await import(…)` per test.
- Assert structure, not bytes: `JSON.parse(body)` with `toEqual`, `new URL(url).searchParams.get(…)`, status codes, `code` fields.
- Controller tests use fake `req`/`res` (`status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis()`). Router tests use `supertest` on a fresh `express()` app.
- No `.skip` or `.only` in committed tests.
