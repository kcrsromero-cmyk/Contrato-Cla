import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotificationService } from '../application/NotificationService';
import { Notifier } from '../domain/Notifier';
import { NotificationChannelNotLinkedError, NotificationDeliveryError } from '../domain/errors';

describe('NotificationService.sendToUser', () => {
  let prisma: { user: { findUnique: ReturnType<typeof vi.fn> } };
  let notifier: Notifier;
  let service: NotificationService;

  beforeEach(() => {
    prisma = { user: { findUnique: vi.fn() } };
    notifier = { send: vi.fn() };
    service = new NotificationService(prisma as any, () => notifier);
  });

  it('sends through the resolved notifier when linked and enabled', async () => {
    prisma.user.findUnique.mockResolvedValue({
      notifyTelegram: true,
      telegramChatId: '123456789',
    });

    await service.sendToUser('user-1', 'hola', 'Contrata360');

    expect(notifier.send).toHaveBeenCalledTimes(1);
    expect(notifier.send).toHaveBeenCalledWith('123456789', 'hola', 'Contrata360');
  });

  it('rejects with TELEGRAM_NOT_LINKED when telegramChatId is null', async () => {
    prisma.user.findUnique.mockResolvedValue({ notifyTelegram: true, telegramChatId: null });

    await expect(service.sendToUser('user-1', 'hola')).rejects.toBeInstanceOf(
      NotificationChannelNotLinkedError
    );
    await expect(service.sendToUser('user-1', 'hola')).rejects.toMatchObject({
      reason: 'TELEGRAM_NOT_LINKED',
    });
    expect(notifier.send).not.toHaveBeenCalled();
  });

  it('rejects with TELEGRAM_DISABLED when linked but notifications are off', async () => {
    prisma.user.findUnique.mockResolvedValue({
      notifyTelegram: false,
      telegramChatId: '123456789',
    });

    await expect(service.sendToUser('user-1', 'hola')).rejects.toBeInstanceOf(
      NotificationChannelNotLinkedError
    );
    await expect(service.sendToUser('user-1', 'hola')).rejects.toMatchObject({
      reason: 'TELEGRAM_DISABLED',
    });
    expect(notifier.send).not.toHaveBeenCalled();
  });

  it('rejects with TELEGRAM_NOT_LINKED when no user row exists', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.sendToUser('user-1', 'hola')).rejects.toMatchObject({
      reason: 'TELEGRAM_NOT_LINKED',
    });
  });

  it('propagates a NotificationDeliveryError from the notifier unchanged', async () => {
    prisma.user.findUnique.mockResolvedValue({
      notifyTelegram: true,
      telegramChatId: '123456789',
    });
    const deliveryError = new NotificationDeliveryError('Apprise responded 502', 502);
    vi.mocked(notifier.send).mockRejectedValue(deliveryError);

    await expect(service.sendToUser('user-1', 'hola')).rejects.toBe(deliveryError);
  });
});
