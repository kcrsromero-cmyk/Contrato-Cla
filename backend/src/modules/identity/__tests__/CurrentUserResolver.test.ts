import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CurrentUserResolver } from '../presentation/CurrentUserResolver';
import { prisma } from '../../../infrastructure/db/prisma';

vi.mock('../../../infrastructure/db/prisma', () => ({
  prisma: {
    user: {
      upsert: vi.fn(),
    },
    plan: {
      findUnique: vi.fn(),
    },
  },
}));

describe('CurrentUserResolver', () => {
  let resolver: CurrentUserResolver;
  let mockIdentityService: any;
  let req: any;
  let res: any;
  let next: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockIdentityService = {
      getCurrentUser: vi.fn(),
    };
    resolver = new CurrentUserResolver(mockIdentityService);

    req = {
      headers: {
        authorization: 'Bearer token-123',
      },
    };
    res = {};
    next = vi.fn();
  });

  it('should attach active paid plan capabilities and maxFavoriteEntities when plan is not expired', async () => {
    const mockUser = { id: 'user-1', email: 'pro@example.com' };
    mockIdentityService.getCurrentUser.mockResolvedValue(mockUser);

    const futureDate = new Date(Date.now() + 86400000);
    const mockDbUser = {
      id: 'user-1',
      email: 'pro@example.com',
      planExpiresAt: futureDate,
      plan: {
        name: 'PROFESIONAL',
        maxFavoriteEntities: 10,
        capabilities: [
          { capability: { name: 'USE_FAVORITES' } },
          { capability: { name: 'ADVANCED_ANALYTICS' } },
        ],
      },
    };

    (prisma.user.upsert as any).mockResolvedValue(mockDbUser);

    await resolver.resolve(req, res, next);

    expect(req.user).toBeDefined();
    expect(req.user.plan).toBe('PROFESIONAL');
    expect(req.user.maxFavoriteEntities).toBe(10);
    expect(req.user.capabilities).toEqual(['USE_FAVORITES', 'ADVANCED_ANALYTICS']);
    expect(prisma.plan.findUnique).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  it('should fall back to real FREE plan capabilities and limits from DB when paid plan is expired', async () => {
    const mockUser = { id: 'user-1', email: 'expired@example.com' };
    mockIdentityService.getCurrentUser.mockResolvedValue(mockUser);

    const pastDate = new Date(Date.now() - 86400000);
    const mockDbUser = {
      id: 'user-1',
      email: 'expired@example.com',
      planExpiresAt: pastDate,
      plan: {
        name: 'PROFESIONAL',
        maxFavoriteEntities: 10,
        capabilities: [
          { capability: { name: 'USE_FAVORITES' } },
          { capability: { name: 'ADVANCED_ANALYTICS' } },
        ],
      },
    };

    const mockDbFreePlan = {
      name: 'FREE',
      maxFavoriteEntities: 3,
      capabilities: [
        { capability: { name: 'USE_FAVORITES' } },
      ],
    };

    (prisma.user.upsert as any).mockResolvedValue(mockDbUser);
    (prisma.plan.findUnique as any).mockResolvedValue(mockDbFreePlan);

    await resolver.resolve(req, res, next);

    expect(prisma.plan.findUnique).toHaveBeenCalledWith({
      where: { name: 'FREE' },
      select: {
        maxFavoriteEntities: true,
        capabilities: { select: { capability: { select: { name: true } } } },
      },
    });

    expect(req.user).toBeDefined();
    expect(req.user.plan).toBe('FREE');
    expect(req.user.maxFavoriteEntities).toBe(3);
    expect(req.user.capabilities).toEqual(['USE_FAVORITES']);
    expect(next).toHaveBeenCalled();
  });

  it('should fall back to real FREE plan when user has no plan assigned', async () => {
    const mockUser = { id: 'user-2', email: 'noplan@example.com' };
    mockIdentityService.getCurrentUser.mockResolvedValue(mockUser);

    const mockDbUser = {
      id: 'user-2',
      email: 'noplan@example.com',
      planExpiresAt: null,
      plan: null,
    };

    const mockDbFreePlan = {
      name: 'FREE',
      maxFavoriteEntities: 3,
      capabilities: [
        { capability: { name: 'USE_FAVORITES' } },
      ],
    };

    (prisma.user.upsert as any).mockResolvedValue(mockDbUser);
    (prisma.plan.findUnique as any).mockResolvedValue(mockDbFreePlan);

    await resolver.resolve(req, res, next);

    expect(prisma.plan.findUnique).toHaveBeenCalledWith({
      where: { name: 'FREE' },
      select: {
        maxFavoriteEntities: true,
        capabilities: { select: { capability: { select: { name: true } } } },
      },
    });

    expect(req.user.plan).toBe('FREE');
    expect(req.user.maxFavoriteEntities).toBe(3);
    expect(req.user.capabilities).toEqual(['USE_FAVORITES']);
    expect(next).toHaveBeenCalled();
  });
});
