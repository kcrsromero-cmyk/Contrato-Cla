import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthController } from '../presentation/AuthController';
import { prisma } from '../../../infrastructure/db/prisma';

vi.mock('../../../infrastructure/db/prisma', () => ({
  prisma: {
    user: {
      update: vi.fn(),
    },
    plan: {
      findUnique: vi.fn(),
    },
  },
}));

describe('AuthController - updateProfile', () => {
  let authController: AuthController;
  let mockIdentityService: any;
  let mockAuditService: any;
  let req: any;
  let res: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockIdentityService = {};
    mockAuditService = { logAction: vi.fn() };
    authController = new AuthController(mockIdentityService, mockAuditService);

    req = {
      user: { id: 'user-123', email: 'test@example.com' },
      body: {},
    };

    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
  });

  it('should update profile fields without altering plan, planId, planExpiresAt, capabilities or limits', async () => {
    req.body = {
      name: 'John Doe',
      phone: '123456789',
      telegramUsername: '@johndoe',
      notifyEmail: true,
      notifyTelegram: false,
      notifySms: true,
      planName: 'PROFESIONAL',
      planId: 'plan-pro-id',
      planExpiresAt: new Date(),
      capabilities: ['ALL'],
      limits: { max: 999 },
    };

    const mockUpdatedUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'John Doe',
      phone: '123456789',
      telegramUsername: 'johndoe',
      notifyEmail: true,
      notifyTelegram: false,
      notifySms: true,
      planId: 'free-plan-id',
      planExpiresAt: null,
      plan: {
        name: 'FREE',
        maxFavoriteEntities: 3,
        capabilities: [],
      },
    };

    (prisma.user.update as any).mockResolvedValue(mockUpdatedUser);

    await authController.updateProfile(req, res);

    expect(prisma.user.update).toHaveBeenCalledTimes(1);
    const updateArgs = (prisma.user.update as any).mock.calls[0][0];

    expect(updateArgs.where).toEqual({ id: 'user-123' });
    expect(updateArgs.data).toEqual({
      name: 'John Doe',
      phone: '123456789',
      telegramUsername: 'johndoe',
      notifyEmail: true,
      notifyTelegram: false,
      notifySms: true,
    });

    // Verify updateData passed to prisma.user.update does NOT contain planId, planExpiresAt, capabilities, limits or planName
    expect(updateArgs.data).not.toHaveProperty('planName');
    expect(updateArgs.data).not.toHaveProperty('planId');
    expect(updateArgs.data).not.toHaveProperty('planExpiresAt');
    expect(updateArgs.data).not.toHaveProperty('capabilities');
    expect(updateArgs.data).not.toHaveProperty('limits');

    // Verify prisma.plan.findUnique was never called
    expect(prisma.plan.findUnique).not.toHaveBeenCalled();

    expect(res.json).toHaveBeenCalledWith(mockUpdatedUser);
  });
});
