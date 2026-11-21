import type { PrismaClient } from '@prisma/client';
import { logger as defaultLogger } from '../../../infrastructure/logger';
import { TELEGRAM_LINK_CODE_PATTERN } from '../domain/TelegramLinkCode';

export interface TelegramUpdate {
  update_id: number;
  message?: {
    text?: string;
    chat: { id: number };
  };
}

export interface TelegramLinkGatewayOptions {
  prisma: Pick<PrismaClient, 'user'>;
  botToken: string;
  fetchImpl?: typeof fetch;
  logger?: typeof defaultLogger;
  pollTimeoutSeconds?: number;
  errorBackoffMs?: number;
  now?: () => Date;
}

const START_CODE_PATTERN = /^\/start(?:@\w+)?\s+(\S+)\s*$/;

export class TelegramLinkGateway {
  private readonly prisma: Pick<PrismaClient, 'user'>;
  private readonly botToken: string;
  private readonly fetchImpl: typeof fetch;
  private readonly logger: typeof defaultLogger;
  private readonly pollTimeoutSeconds: number;
  private readonly errorBackoffMs: number;
  private readonly now: () => Date;

  constructor(options: TelegramLinkGatewayOptions) {
    this.prisma = options.prisma;
    this.botToken = options.botToken;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.logger = options.logger ?? defaultLogger;
    this.pollTimeoutSeconds = options.pollTimeoutSeconds ?? 25;
    this.errorBackoffMs = options.errorBackoffMs ?? 5000;
    this.now = options.now ?? (() => new Date());
  }

  static parseStartCode(text: string | undefined): string | null {
    if (!text) return null;
    const match = text.match(START_CODE_PATTERN);
    if (!match) return null;
    const code = match[1].toUpperCase();
    return TELEGRAM_LINK_CODE_PATTERN.test(code) ? code : null;
  }

  async handleUpdate(update: TelegramUpdate): Promise<'linked' | 'ignored'> {
    const code = TelegramLinkGateway.parseStartCode(update.message?.text);
    if (!update.message || !code) {
      return 'ignored';
    }

    const user = await this.prisma.user.findUnique({
      where: { telegramLinkCode: code },
      select: { id: true, telegramLinkCodeExpiresAt: true },
    });

    if (!user || !user.telegramLinkCodeExpiresAt) {
      this.logger.info('Telegram link code ignored', { reason: 'unknown' });
      return 'ignored';
    }

    if (user.telegramLinkCodeExpiresAt <= this.now()) {
      this.logger.info('Telegram link code ignored', { reason: 'expired' });
      return 'ignored';
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        telegramChatId: String(update.message.chat.id),
        telegramLinkCode: null,
        telegramLinkCodeExpiresAt: null,
      },
    });
    this.logger.info('Telegram account linked', { userId: user.id });
    return 'linked';
  }
}
