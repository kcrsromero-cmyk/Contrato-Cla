import { Notifier } from '../domain/Notifier';
import { NotificationDeliveryError } from '../domain/errors';

export interface AppriseNotifierOptions {
  baseUrl: string;
  botToken: string;
  timeoutMs?: number;
}

const TELEGRAM_CHAT_ID_PATTERN = /^-?\d+$/;

export class AppriseNotifier implements Notifier {
  constructor(private readonly options: AppriseNotifierOptions) {}

  async send(recipient: string, message: string, title?: string): Promise<void> {
    if (!TELEGRAM_CHAT_ID_PATTERN.test(recipient)) {
      throw new NotificationDeliveryError('Invalid Telegram chat id');
    }

    const url = `${this.options.baseUrl.replace(/\/+$/, '')}/notify/`;
    const body = JSON.stringify({
      urls: `tgram://${this.options.botToken}/${recipient}`,
      body: message,
      title,
    });

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal: AbortSignal.timeout(this.options.timeoutMs ?? 10000),
      });
    } catch {
      throw new NotificationDeliveryError('Apprise request failed');
    }

    if (!response.ok) {
      throw new NotificationDeliveryError(`Apprise responded ${response.status}`, response.status);
    }
  }
}
