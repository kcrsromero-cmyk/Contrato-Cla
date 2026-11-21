import type { PrismaClient } from '@prisma/client';
import { Notifier } from '../domain/Notifier';
import { NotifierRegistry } from '../infrastructure/NotifierRegistry';
import { NotificationChannelNotLinkedError } from '../domain/errors';
import { generateTelegramLinkCode, TELEGRAM_LINK_CODE_TTL_MS } from '../domain/TelegramLinkCode';

export class NotificationService {
  constructor(
    private readonly prisma: Pick<PrismaClient, 'user'>,
    private readonly resolveNotifier: () => Notifier = () => NotifierRegistry.resolve(),
    private readonly generateCode: () => string = generateTelegramLinkCode
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

  async createTelegramLinkCode(
    userId: string,
    now: Date = new Date()
  ): Promise<{ code: string; expiresAt: Date }> {
    const expiresAt = new Date(now.getTime() + TELEGRAM_LINK_CODE_TTL_MS);

    for (let attempt = 0; attempt < 3; attempt++) {
      const code = this.generateCode();
      try {
        await this.prisma.user.update({
          where: { id: userId },
          data: { telegramLinkCode: code, telegramLinkCodeExpiresAt: expiresAt },
        });
        return { code, expiresAt };
      } catch (error: any) {
        if (error?.code !== 'P2002') {
          throw error;
        }
      }
    }

    throw new Error('Could not allocate a unique Telegram link code');
  }
}
