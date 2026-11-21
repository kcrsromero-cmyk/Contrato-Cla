import type { PrismaClient } from '@prisma/client';
import { Notifier } from '../domain/Notifier';
import { NotifierRegistry } from '../infrastructure/NotifierRegistry';
import { NotificationChannelNotLinkedError } from '../domain/errors';

export class NotificationService {
  constructor(
    private readonly prisma: Pick<PrismaClient, 'user'>,
    private readonly resolveNotifier: () => Notifier = () => NotifierRegistry.resolve()
  ) {}

  async sendToUser(userId: string, message: string, title?: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { notifyTelegram: true, telegramChatId: true },
    });

    if (!user || !user.telegramChatId) {
      throw new NotificationChannelNotLinkedError('TELEGRAM_NOT_LINKED');
    }

    if (!user.notifyTelegram) {
      throw new NotificationChannelNotLinkedError('TELEGRAM_DISABLED');
    }

    await this.resolveNotifier().send(user.telegramChatId, message, title);
  }
}
