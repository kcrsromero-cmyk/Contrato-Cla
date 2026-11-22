import { describe, it, expect } from 'vitest';
import { normalizeDocumentNumber } from '../documentNormalizer';

describe('normalizeDocumentNumber', () => {
  it('strips dots from a formatted CC', () => {
    expect(normalizeDocumentNumber('17.651.267')).toBe('17651267');
  });

  it('strips the hyphen before a NIT check digit', () => {
    expect(normalizeDocumentNumber('900540947-1')).toBe('9005409471');
  });

  it('is a no-op for an already-clean number', () => {
    expect(normalizeDocumentNumber('9005409471')).toBe('9005409471');
  });

  it('strips spaces and keeps letters (e.g. a passport number)', () => {
    expect(normalizeDocumentNumber('AB 123 456')).toBe('AB123456');
  });
});
