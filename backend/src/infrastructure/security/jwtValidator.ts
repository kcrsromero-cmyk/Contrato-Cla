import { JWTValidator } from '../../modules/identity/infrastructure/JWTValidator';
import { config, resolveJwtIssuer } from '../config/env';

export const jwtValidator = new JWTValidator(config.AUTH_JWKS_URL, {
  issuer: resolveJwtIssuer(config.AUTH_JWKS_URL, config.AUTH_JWT_ISSUER),
  audience: config.AUTH_JWT_AUDIENCE,
});
