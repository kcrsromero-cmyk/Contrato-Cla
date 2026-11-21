import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../infrastructure/db/prisma', () => ({
  prisma: {
    user: { upsert: vi.fn() },
    plan: { findUnique: vi.fn() },
  },
}));

import { prisma } from '../../../infrastructure/db/prisma';
import { CurrentUserResolver } from '../presentation/CurrentUserResolver';
import { buildAuthenticatedUserFromDbUser, PlanWithCapabilities, UserWithPlan } from '../application/ApiKeyUserMapper';

const businessPlan: PlanWithCapabilities = {
  name: 'BUSINESS',
  maxFavoriteEntities: 25,
  apiRequestsPerMinute: 60,
  capabilities: ['USE_FAVORITES', 'USE_API'].map((name) => ({ capability: { name } })),
};

const freePlan: PlanWithCapabilities = {
  name: 'FREE',
  maxFavoriteEntities: 0,
  apiRequestsPerMinute: null,
  capabilities: [{ capability: { name: 'USE_FAVORITES' } }],
};

const baseUser = {
  id: 'user-1',
  email: 'u@test.com',
  name: 'Ana',
  roles: ['USER'],
  phone: '3001234567',
  telegramUsername: 'ana',
  notifyEmail: true,
  notifyTelegram: false,
  notifySms: false,
};

const now = new Date();
const future = new Date(now.getTime() + 86400000);
const past = new Date(now.getTime() - 86400000);

const states: Record<string, UserWithPlan> = {
  active: { ...baseUser, planExpiresAt: future, plan: businessPlan },
  expired: { ...baseUser, planExpiresAt: past, plan: businessPlan },
  noPlan: { ...baseUser, planExpiresAt: null, plan: null },
};

describe('buildAuthenticatedUserFromDbUser', () => {
  it('uses the active plan and does not call loadFreePlan', async () => {
    const loadFreePlan = vi.fn();
    const { user, apiRequestsPerMinute } = await buildAuthenticatedUserFromDbUser(states.active, loadFreePlan, now);

    expect(user.plan).toBe('BUSINESS');
    expect(user.maxFavoriteEntities).toBe(25);
    expect(user.capabilities).toEqual(['USE_FAVORITES', 'USE_API']);
    expect(apiRequestsPerMinute).toBe(60);
    expect(loadFreePlan).not.toHaveBeenCalled();
  });

  it('falls back to FREE when the plan has expired', async () => {
    const loadFreePlan = vi.fn(async () => freePlan);
    const { user, apiRequestsPerMinute } = await buildAuthenticatedUserFromDbUser(states.expired, loadFreePlan, now);

    expect(user.plan).toBe('FREE');
    expect(user.maxFavoriteEntities).toBe(0);
    expect(user.capabilities).toEqual(['USE_FAVORITES']);
    expect(apiRequestsPerMinute).toBeNull();
  });

  it('falls back to FREE when there is no plan', async () => {
    const loadFreePlan = vi.fn(async () => freePlan);
    const { user, apiRequestsPerMinute } = await buildAuthenticatedUserFromDbUser(states.noPlan, loadFreePlan, now);

    expect(user.plan).toBe('FREE');
    expect(user.maxFavoriteEntities).toBe(0);
    expect(user.capabilities).toEqual(['USE_FAVORITES']);
    expect(apiRequestsPerMinute).toBeNull();
  });

  it('defaults to zero/empty/null when loadFreePlan returns null', async () => {
    const loadFreePlan = vi.fn(async () => null);
    const { user, apiRequestsPerMinute } = await buildAuthenticatedUserFromDbUser(states.noPlan, loadFreePlan, now);

    expect(user.plan).toBe('FREE');
    expect(user.maxFavoriteEntities).toBe(0);
    expect(user.capabilities).toEqual([]);
    expect(apiRequestsPerMinute).toBeNull();
  });

  it('sets identity fields from the database row and never sets organizationId', async () => {
    const { user } = await buildAuthenticatedUserFromDbUser(states.active, vi.fn(), now);

    expect(user.id).toBe('user-1');
    expect(user.email).toBe('u@test.com');
    expect(user.roles).toEqual(['USER']);
    expect(user.permissions).toEqual([]);
    expect('organizationId' in user).toBe(false);
  });
});

describe('ApiKeyUserMapper / CurrentUserResolver parity', () => {
  it.each(Object.entries(states))('matches CurrentUserResolver for the %s state', async (_label, dbUser) => {
    (prisma.user.upsert as any).mockResolvedValue(dbUser);
    (prisma.plan.findUnique as any).mockResolvedValue(freePlan);

    const resolver = new CurrentUserResolver({
      getCurrentUser: vi.fn(async () => ({ id: 'user-1', email: 'u@test.com', roles: ['USER'], permissions: [] })),
    } as any);
    const req: any = { headers: { authorization: 'Bearer t' } };
    await resolver.resolve(req, {} as any, vi.fn());

    const { user: mapped } = await buildAuthenticatedUserFromDbUser(dbUser, async () => freePlan, now);

    const pick = (u: any) => ({
      plan: u.plan,
      maxFavoriteEntities: u.maxFavoriteEntities,
      capabilities: u.capabilities,
      planExpiresAt: u.planExpiresAt,
      phone: u.phone,
      telegramUsername: u.telegramUsername,
      notifyEmail: u.notifyEmail,
      notifyTelegram: u.notifyTelegram,
      notifySms: u.notifySms,
    });

    expect(pick(mapped)).toEqual(pick(req.user));
  });
});
