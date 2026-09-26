import { z } from 'zod';
import dotenv from 'dotenv';

// No-op si las variables ya están en el entorno (Docker/Coolify)
dotenv.config();

// Variables opcionales: una cadena vacía (p. ej. ${VAR} sin valor en docker-compose) cuenta como no definida.
const optional = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => (v === '' ? undefined : v), schema.optional());

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
  // Proxies de confianza delante de la API: nº de saltos (Traefik/Coolify = 1) o lista de IPs/subredes.
  TRUST_PROXY:              optional(z.string()).transform((v) => v ?? '1'),
  // Emisor esperado del JWT. Si no se define, se deriva de AUTH_JWKS_URL (formato Supabase).
  AUTH_JWT_ISSUER:          optional(z.string().url()),
  AUTH_JWT_AUDIENCE:        optional(z.string().min(1)).transform((v) => v ?? 'authenticated'),
});

const result = EnvSchema.safeParse(process.env);

if (!result.success) {
  console.error('[FATAL] Invalid or missing environment variables:');
  console.error(JSON.stringify(result.error.flatten().fieldErrors, null, 2));
  process.exit(1);
}

export const config = result.data;

/**
 * Convierte TRUST_PROXY al formato de Express:
 * número de saltos ("1"), booleano ("true"/"false") o lista de IPs/subredes.
 */
export function parseTrustProxy(value: string): number | boolean | string {
  const v = value.trim();
  if (/^\d+$/.test(v)) return Number(v);
  if (v === 'true') return true;
  if (v === 'false') return false;
  return v;
}

/** Emisor esperado del JWT: AUTH_JWT_ISSUER o la URL del JWKS sin "/.well-known/jwks.json". */
export function resolveJwtIssuer(jwksUrl: string, explicitIssuer?: string): string {
  const issuer = explicitIssuer ?? jwksUrl.replace(/\/\.well-known\/jwks\.json\/?$/, '');
  return issuer.replace(/\/+$/, '');
}
