import { JWTValidator } from '../../modules/identity/infrastructure/JWTValidator';

const jwksUrl = process.env.SUPABASE_JWKS_URL || '';

if (!jwksUrl && process.env.NODE_ENV !== 'test') {
  console.warn('[JWTValidator] SUPABASE_JWKS_URL is not defined in environment variables.');
}

export const jwtValidator = new JWTValidator(jwksUrl);
