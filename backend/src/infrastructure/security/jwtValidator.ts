import { JWTValidator } from '../../modules/identity/infrastructure/JWTValidator';

const jwksUrl = process.env.AUTH_JWKS_URL;

if (!jwksUrl) {
  console.error('[FATAL] AUTH_JWKS_URL is not defined. Cannot initialize JWT validation. Exiting.');
  process.exit(1);
}

export const jwtValidator = new JWTValidator(jwksUrl);
