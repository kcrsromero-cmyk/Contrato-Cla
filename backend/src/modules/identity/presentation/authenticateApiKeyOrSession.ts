import { Request, Response, NextFunction, RequestHandler } from 'express';
import { isApiKeyAuthorization } from '../domain/ApiKey';

export const SESSION_REQUIRED_RESPONSE = {
  error: 'Las claves de API no pueden administrar claves de API. Usa tu sesión de la aplicación web.',
  code: 'SESSION_REQUIRED',
} as const;

/** Runs Express handlers in order; stops when one responds without calling next(). */
export const runHandlers = (handlers: RequestHandler[], req: Request, res: Response, done: NextFunction): void => {
  let index = 0;
  const step = (error?: unknown): void => {
    if (error) {
      done(error);
      return;
    }
    const handler = handlers[index++];
    if (!handler) {
      done();
      return;
    }
    try {
      const result: unknown = handler(req, res, step);
      if (result instanceof Promise) result.catch(done);
    } catch (thrown) {
      done(thrown);
    }
  };
  step();
};

export interface AuthenticateApiKeyOrSessionDeps {
  apiKeyHandlers: RequestHandler[];
  sessionHandlers: RequestHandler[];
}

/**
 * `Authorization: Bearer ctr360_…` → the API-key handlers; anything else → the session
 * handlers, unchanged (they keep answering exactly as before for a missing or invalid header).
 */
export const createAuthenticateApiKeyOrSession = ({ apiKeyHandlers, sessionHandlers }: AuthenticateApiKeyOrSessionDeps): RequestHandler =>
  (req, res, next) =>
    runHandlers(isApiKeyAuthorization(req.headers.authorization) ? apiKeyHandlers : sessionHandlers, req, res, next);

/**
 * Same routing as `createAuthenticateApiKeyOrSession`, but a request with no `Authorization`
 * header at all passes through anonymously instead of being rejected. A header that IS present
 * still has to be valid — this never downgrades a bad credential to anonymous.
 */
export const createAuthenticateOptionally = ({ apiKeyHandlers, sessionHandlers }: AuthenticateApiKeyOrSessionDeps): RequestHandler =>
  (req, res, next) => {
    if (!req.headers.authorization) {
      next();
      return;
    }
    runHandlers(isApiKeyAuthorization(req.headers.authorization) ? apiKeyHandlers : sessionHandlers, req, res, next);
  };

/** First handler on key-management routes: an API key can never mint, list or revoke keys. */
export const requireSessionAuth: RequestHandler = (req, res, next) => {
  if (isApiKeyAuthorization(req.headers.authorization)) {
    res.status(403).json({ ...SESSION_REQUIRED_RESPONSE });
    return;
  }
  next();
};
