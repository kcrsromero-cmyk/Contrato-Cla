export type NotificationChannelNotLinkedReason = 'TELEGRAM_NOT_LINKED' | 'TELEGRAM_DISABLED';

const MESSAGES: Record<NotificationChannelNotLinkedReason, string> = {
  TELEGRAM_NOT_LINKED:
    'Tu cuenta no tiene un chat de Telegram vinculado. Genera un código con POST /api/v1/notifications/telegram/link-code y envíalo al bot como /start <código>.',
  TELEGRAM_DISABLED:
    'Las notificaciones por Telegram están desactivadas. Actívalas con PATCH /api/v1/auth/profile enviando { "notifyTelegram": true }.',
};

export class NotificationChannelNotLinkedError extends Error {
  readonly name = 'NotificationChannelNotLinkedError';

  constructor(readonly reason: NotificationChannelNotLinkedReason) {
    super(MESSAGES[reason]);
  }
}

export class NotificationDeliveryError extends Error {
  readonly name = 'NotificationDeliveryError';

  constructor(message: string, readonly status?: number) {
    super(message);
  }
}
