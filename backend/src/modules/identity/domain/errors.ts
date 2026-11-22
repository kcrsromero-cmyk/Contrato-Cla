export class ApiKeyAuthenticationError extends Error {
  readonly name = 'ApiKeyAuthenticationError';
  readonly code = 'INVALID_API_KEY';

  constructor() {
    super('La clave de API es inválida o fue revocada.');
  }
}

export class ApiAccessNotAllowedError extends Error {
  readonly name = 'ApiAccessNotAllowedError';
  readonly code = 'API_ACCESS_NOT_IN_PLAN';

  constructor() {
    super('Tu plan actual no incluye acceso por API.');
  }
}

export class ApiKeyNotFoundError extends Error {
  readonly name = 'ApiKeyNotFoundError';
  readonly code = 'API_KEY_NOT_FOUND';

  constructor() {
    super('Clave de API no encontrada.');
  }
}

export class ApiKeyLimitExceededError extends Error {
  readonly name = 'ApiKeyLimitExceededError';
  readonly code = 'API_KEY_LIMIT_EXCEEDED';

  constructor() {
    super('Alcanzaste el máximo de 10 claves de API activas. Revoca una existente antes de crear otra.');
  }
}
