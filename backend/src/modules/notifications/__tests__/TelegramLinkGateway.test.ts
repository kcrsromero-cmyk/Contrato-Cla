import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TelegramLinkGateway } from '../infrastructure/TelegramLinkGateway';

vi.mock('../../../infrastructure/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe('TelegramLinkGateway.parseStartCode', () => {
  it('parses and upper-cases a code with a bot-username suffix', () => {
    expect(TelegramLinkGateway.parseStartCode('/start@ContrataBot abcd2345')).toBe('ABCD2345');
  });

  it('returns null for a code that does not match the pattern', () => {
    expect(TelegramLinkGateway.parseStartCode('/start ABC')).toBeNull();
  });
});

describe('TelegramLinkGateway.handleUpdate', () => {
  let prisma: { user: { findUnique: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> } };
  let gateway: TelegramLinkGateway;

  beforeEach(() => {
    prisma = { user: { findUnique: vi.fn(), update: vi.fn() } };
    gateway = new TelegramLinkGateway({
      prisma: prisma as any,
      botToken: 'TEST_TOKEN',
      now: () => new Date('2026-11-20T10:00:00.000Z'),
    });
  });

  it('links the account when the code belongs to a user with a future expiry', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      telegramLinkCodeExpiresAt: new Date('2026-11-20T10:10:00.000Z'),
    });
    prisma.user.update.mockResolvedValue({});

    const result = await gateway.handleUpdate({
      update_id: 1,
      message: { text: '/start ABCD2345', chat: { id: 123456789 } },
    });

    expect(result).toBe('linked');
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { telegramChatId: '123456789', telegramLinkCode: null, telegramLinkCodeExpiresAt: null },
    });
  });

  it('ignores an expired code without updating', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      telegramLinkCodeExpiresAt: new Date('2026-11-20T10:00:00.000Z'),
    });

    const result = await gateway.handleUpdate({
      update_id: 1,
      message: { text: '/start ABCD2345', chat: { id: 123456789 } },
    });

    expect(result).toBe('ignored');
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('ignores a code that belongs to no user', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    const result = await gateway.handleUpdate({
      update_id: 1,
      message: { text: '/start ABCD2345', chat: { id: 123456789 } },
    });

    expect(result).toBe('ignored');
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('ignores a plain-text message without querying prisma', async () => {
    const result = await gateway.handleUpdate({
      update_id: 1,
      message: { text: 'hola', chat: { id: 123456789 } },
    });

    expect(result).toBe('ignored');
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('ignores an update with no message without querying prisma', async () => {
    const result = await gateway.handleUpdate({ update_id: 1 });

    expect(result).toBe('ignored');
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
});
