import { describe, it, expect } from 'vitest';
import { isPlanActive } from '../presentation/planMiddleware';

describe('isPlanActive', () => {
  it('returns true for FREE plan regardless of planExpiresAt', () => {
    const user1 = { plan: 'FREE', planExpiresAt: new Date(Date.now() - 100000) };
    const user2 = { plan: { name: 'FREE' }, planExpiresAt: new Date(Date.now() - 100000) };

    expect(isPlanActive(user1 as any)).toBe(true);
    expect(isPlanActive(user2 as any)).toBe(true);
  });

  it('returns true if paid plan has no planExpiresAt', () => {
    const user = { plan: 'STARTER', planExpiresAt: null };
    expect(isPlanActive(user as any)).toBe(true);
  });

  it('returns true if paid plan expiration date is in the future', () => {
    const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24);
    const user = { plan: 'PROFESIONAL', planExpiresAt: futureDate };
    expect(isPlanActive(user as any)).toBe(true);
  });

  it('returns false if paid plan expiration date is in the past', () => {
    const pastDate = new Date(Date.now() - 1000 * 60 * 60 * 24);
    const user = { plan: 'ENTERPRISE', planExpiresAt: pastDate };
    expect(isPlanActive(user as any)).toBe(false);
  });
});
