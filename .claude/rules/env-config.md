---
description: Environment configuration conventions
paths:
  - "backend/src/infrastructure/config/**"
  - "backend/.env.example"
  - ".env.example"
  - "docker-compose.yml"
---

# Environment configuration

- `EnvSchema` in `backend/src/infrastructure/config/env.ts` is the only reader of `process.env` in application code. It runs `dotenv.config()`, then `safeParse`, and exits 1 with `[FATAL] Invalid or missing environment variables` on failure.
- Secrets are required with no default (`z.string().min(1)`). Non-secret settings may default (`.default(…)`). The default must equal the value compose sets.
- Every new key is added in four places in the same step: `EnvSchema`, `backend/.env.example` (local value or blank), the root `.env.example` (when compose interpolates it), and the `environment:` list of every compose service that runs code reading it (`backend` and/or `worker`).
- Compose form: `- KEY=${KEY}` for required secrets (unset → empty → boot fails loudly), `- KEY=${KEY:-}` for optional ones.
- Adding a required key breaks any test that loads `env.ts` with a hand-built environment. Update `backend/src/__tests__/apiRoutes.test.ts`'s `process.env` assignments in the same step.
- Never change an existing key's name, value or requiredness in this change. `APPRISE_URL=http://apprise:8000` is frozen.
- Never commit a real `.env`. Root `.gitignore` ignores `.env*` and keeps `!.env.example`.
