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
