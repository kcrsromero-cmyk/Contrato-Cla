import { createHash, randomBytes } from 'node:crypto';

export const API_KEY_PREFIX = 'ctr360_';
export const API_KEY_RANDOM_BYTES = 32;
export const API_KEY_DISPLAY_PREFIX_LENGTH = 12;
const escapedPrefix = API_KEY_PREFIX.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export const API_KEY_PATTERN = new RegExp(`^${escapedPrefix}[A-Za-z0-9_-]{43}$`);

export interface GeneratedApiKey {
  plaintext: string;
  keyPrefix: string;
  keyHash: string;
}

/** What ApiKeyAuthMiddleware attaches as `(req as any).apiKey` for the per-key limiter. */
export interface ApiKeyRequestContext {
  id: string;
  apiRequestsPerMinute: number | null;
}

/** One-way SHA-256 (lowercase hex). A 256-bit random key needs no slow password hash. */
export function hashApiKey(plaintext: string): string {
  return createHash('sha256').update(plaintext, 'utf8').digest('hex');
}

export function generateApiKey(): GeneratedApiKey {
  const plaintext = API_KEY_PREFIX + randomBytes(API_KEY_RANDOM_BYTES).toString('base64url');
  return {
    plaintext,
    keyPrefix: plaintext.slice(0, API_KEY_DISPLAY_PREFIX_LENGTH),
    keyHash: hashApiKey(plaintext),
  };
}

/** The token after the exact, case-sensitive `Bearer ` prefix, or null. */
export function extractBearerToken(authorization: string | undefined): string | null {
  if (!authorization || !authorization.startsWith('Bearer ')) return null;
  return authorization.slice('Bearer '.length);
}

/**
 * Accepted only so a key issued before this prefix existed still routes to the API-key
 * handlers and fails there with a clean 401 INVALID_API_KEY, instead of falling through to
 * session/JWT verification and surfacing a raw parser error. Never used to generate new keys.
 */
const LEGACY_API_KEY_PREFIX = 'ck_live_';

/**
 * True for `Bearer ctr360_…` (current) or `Bearer ck_live_…` (legacy, see `LEGACY_API_KEY_PREFIX`).
 * A Supabase JWT starts with `eyJ`, so it can never match either.
 */
export function isApiKeyAuthorization(authorization: string | undefined): boolean {
  const token = extractBearerToken(authorization);
  return token !== null && (token.startsWith(API_KEY_PREFIX) || token.startsWith(LEGACY_API_KEY_PREFIX));
}
