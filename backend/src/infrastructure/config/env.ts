import { z } from 'zod';
import dotenv from 'dotenv';

// No-op si las variables ya están en el entorno (Docker/Coolify)
dotenv.config();

const EnvSchema = z.object({
  DATABASE_URL:             z.string().min(1),
  REDIS_URL:                z.string().min(1),
  SUPABASE_URL:             z.string().url(),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  AUTH_JWKS_URL:            z.string().url(),
  FRONTEND_URL:             z.string().url(),
  SOCRATA_APP_TOKEN:        z.string().min(1),
  SOCRATA_DATASET_URL:      z.string().url(),
  PORT:                     z.string().default('4000'),
  LOG_LEVEL:                z.string().default('info'),
  NODE_ENV:                 z.enum(['development', 'production', 'test']).default('development'),
});

const result = EnvSchema.safeParse(process.env);

if (!result.success) {
  console.error('[FATAL] Invalid or missing environment variables:');
  console.error(JSON.stringify(result.error.flatten().fieldErrors, null, 2));
  process.exit(1);
}

export const config = result.data;
