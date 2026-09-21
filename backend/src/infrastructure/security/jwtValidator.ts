import { JWTValidator } from '../../modules/identity/infrastructure/JWTValidator';
import { config } from '../config/env';

export const jwtValidator = new JWTValidator(config.AUTH_JWKS_URL);
