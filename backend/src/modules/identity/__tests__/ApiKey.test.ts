import { createHash } from 'node:crypto';
import { describe, it, expect } from 'vitest';
import {
  API_KEY_PATTERN,
  extractBearerToken,
  generateApiKey,
  isApiKeyAuthorization,
} from '../domain/ApiKey';
import { ApiAccessNotAllowedError, ApiKeyAuthenticationError, ApiKeyLimitExceededError, ApiKeyNotFoundError } from '../domain/errors';

describe('generateApiKey', () => {
  it('returns a plaintext matching the pattern, a 12-char prefix and the SHA-256 hash', () => {
    const { plaintext, keyPrefix, keyHash } = generateApiKey();

    expect(plaintext).toMatch(API_KEY_PATTERN);
    expect(plaintext.startsWith('ctr360_')).toBe(true);
    expect(plaintext).toHaveLength(50);
    expect(keyPrefix).toBe(plaintext.slice(0, 12));
    expect(keyHash).toBe(createHash('sha256').update(plaintext).digest('hex'));
    expect(keyHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('returns different plaintexts and hashes on each call', () => {
    const first = generateApiKey();
    const second = generateApiKey();

    expect(first.plaintext).not.toBe(second.plaintext);
    expect(first.keyHash).not.toBe(second.keyHash);
  });
});

describe('isApiKeyAuthorization', () => {
  it('returns true for a well-formed Bearer api key', () => {
    expect(isApiKeyAuthorization('Bearer ctr360_abc')).toBe(true);
  });

  it('returns true for the legacy ck_live_ prefix, routed here only to fail authentication cleanly', () => {
    expect(isApiKeyAuthorization('Bearer ck_live_abc')).toBe(true);
  });

  it.each([
    ['a JWT', 'Bearer eyJhbGciOiJIUzI1NiJ9.e30.sig'],
    ['a missing header', undefined],
    ['a token without the Bearer prefix', 'ctr360_abc'],
    ['a lowercase bearer prefix', 'bearer ctr360_abc'],
    ['a Basic header', 'Basic Y2tfbGl2ZV8='],
  ])('returns false for %s', (_label, authorization) => {
    expect(isApiKeyAuthorization(authorization)).toBe(false);
  });
});

describe('extractBearerToken', () => {
  it('returns the token after the exact Bearer prefix', () => {
    expect(extractBearerToken('Bearer xyz')).toBe('xyz');
  });

  it('returns null for a different scheme', () => {
    expect(extractBearerToken('Token xyz')).toBeNull();
  });
});

describe('typed API key errors', () => {
  it('ApiKeyAuthenticationError exposes the expected code and name', () => {
    const error = new ApiKeyAuthenticationError();
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('ApiKeyAuthenticationError');
    expect(error.code).toBe('INVALID_API_KEY');
    expect(error.message.length).toBeGreaterThan(0);
  });

  it('ApiAccessNotAllowedError exposes the expected code and name', () => {
    const error = new ApiAccessNotAllowedError();
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('ApiAccessNotAllowedError');
    expect(error.code).toBe('API_ACCESS_NOT_IN_PLAN');
    expect(error.message.length).toBeGreaterThan(0);
  });

  it('ApiKeyNotFoundError exposes the expected code and name', () => {
    const error = new ApiKeyNotFoundError();
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('ApiKeyNotFoundError');
    expect(error.code).toBe('API_KEY_NOT_FOUND');
    expect(error.message.length).toBeGreaterThan(0);
  });

  it('ApiKeyLimitExceededError exposes the expected code and name', () => {
    const error = new ApiKeyLimitExceededError();
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('ApiKeyLimitExceededError');
    expect(error.code).toBe('API_KEY_LIMIT_EXCEEDED');
    expect(error.message.length).toBeGreaterThan(0);
  });
});
