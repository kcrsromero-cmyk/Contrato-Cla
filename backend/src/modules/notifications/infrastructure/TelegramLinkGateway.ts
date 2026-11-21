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

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true }
    );
  });
}

export class TelegramLinkGateway {
  private readonly prisma: Pick<PrismaClient, 'user'>;
  private readonly botToken: string;
  private readonly fetchImpl: typeof fetch;
  private readonly logger: typeof defaultLogger;
  private readonly pollTimeoutSeconds: number;
  private readonly errorBackoffMs: number;
  private readonly now: () => Date;

  private offset = 0;
  private running = false;
  private abortController: AbortController | null = null;
  private loopPromise: Promise<void> | null = null;

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

  async pollOnce(): Promise<void> {
    const signal = this.abortController?.signal;
    const query = new URLSearchParams({
      offset: String(this.offset),
      timeout: String(this.pollTimeoutSeconds),
      allowed_updates: '["message"]',
    });
    const url = `https://api.telegram.org/bot${this.botToken}/getUpdates?${query.toString()}`;

    const response = await this.fetchImpl(url, { signal });

    if (!response.ok) {
      throw new Error(`Telegram getUpdates responded ${response.status}`);
    }

    const { ok, result } = (await response.json()) as { ok: boolean; result: TelegramUpdate[] };
    if (ok !== true) {
      throw new Error('Telegram getUpdates returned ok=false');
    }

    for (const update of result) {
      try {
        await this.handleUpdate(update);
      } catch (e: any) {
        this.logger.error('Telegram update handling failed', {
          updateId: update.update_id,
          error: e?.message,
        });
      }
      this.offset = update.update_id + 1;
    }
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.abortController = new AbortController();
    this.loopPromise = this.loop();
  }

  private async loop(): Promise<void> {
    while (this.running) {
      try {
        await this.pollOnce();
      } catch (e: any) {
        if (!this.running) return;
        this.logger.warn('Telegram getUpdates failed', { error: e?.message });
        await sleep(this.errorBackoffMs, this.abortController!.signal);
      }
    }
  }

  async stop(): Promise<void> {
    this.running = false;
    this.abortController?.abort();
    await this.loopPromise;
    this.loopPromise = null;
  }
}
