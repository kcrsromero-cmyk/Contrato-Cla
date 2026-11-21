import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateTelegramLinkCode,
  TELEGRAM_LINK_CODE_PATTERN,
} from '../domain/TelegramLinkCode';
import { NotificationService } from '../application/NotificationService';

describe('generateTelegramLinkCode', () => {
  it('always returns a code matching the link-code pattern', () => {
    for (let i = 0; i < 1000; i++) {
      expect(generateTelegramLinkCode()).toMatch(TELEGRAM_LINK_CODE_PATTERN);
    }
  });
});

describe('NotificationService.createTelegramLinkCode', () => {
  let prisma: { user: { update: ReturnType<typeof vi.fn> } };

  beforeEach(() => {
    prisma = { user: { update: vi.fn() } };
  });

  const p2002 = () => Object.assign(new Error('x'), { code: 'P2002' });

  it('updates the user with the generated code and the TTL-based expiry', async () => {
    prisma.user.update.mockResolvedValue({});
    const generateCode = vi.fn().mockReturnValue('ABCD2345');
    const service = new NotificationService(prisma as any, () => ({ send: vi.fn() }), generateCode);

    const result = await service.createTelegramLinkCode(
      'user-1',
      new Date('2026-11-20T10:00:00.000Z')
    );

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: {
        telegramLinkCode: 'ABCD2345',
        telegramLinkCodeExpiresAt: new Date('2026-11-20T10:15:00.000Z'),
      },
    });
    expect(result.code).toBe('ABCD2345');
    expect(result.expiresAt.toISOString()).toBe('2026-11-20T10:15:00.000Z');
  });

  it('retries once on a P2002 collision and resolves on the second attempt', async () => {
    prisma.user.update.mockRejectedValueOnce(p2002()).mockResolvedValueOnce({});
    const generateCode = vi.fn().mockReturnValueOnce('AAAAAAAA').mockReturnValueOnce('BBBBBBBB');
    const service = new NotificationService(prisma as any, () => ({ send: vi.fn() }), generateCode);

    const result = await service.createTelegramLinkCode('user-1', new Date('2026-11-20T10:00:00.000Z'));

    expect(prisma.user.update).toHaveBeenCalledTimes(2);
    expect(result.code).toBe('BBBBBBBB');
  });

  it('gives up after 3 collisions with a fixed message', async () => {
    prisma.user.update.mockRejectedValue(p2002());
    const service = new NotificationService(prisma as any, () => ({ send: vi.fn() }));

    await expect(service.createTelegramLinkCode('user-1')).rejects.toThrow(
      'Could not allocate a unique Telegram link code'
    );
    expect(prisma.user.update).toHaveBeenCalledTimes(3);
  });

  it('rethrows a non-P2002 error after exactly 1 call', async () => {
    const otherError = Object.assign(new Error('not found'), { code: 'P2025' });
    prisma.user.update.mockRejectedValue(otherError);
    const service = new NotificationService(prisma as any, () => ({ send: vi.fn() }));

    await expect(service.createTelegramLinkCode('user-1')).rejects.toBe(otherError);
    expect(prisma.user.update).toHaveBeenCalledTimes(1);
  });
});
