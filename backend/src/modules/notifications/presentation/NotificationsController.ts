import { Request, Response } from 'express';
import { NotificationService } from '../application/NotificationService';
import { NotificationChannelNotLinkedError, NotificationDeliveryError } from '../domain/errors';
import { logger } from '../../../infrastructure/logger';

export const TEST_NOTIFICATION_TITLE = 'Contrata360';
export const TEST_NOTIFICATION_MESSAGE =
  'Notificación de prueba: tu cuenta de Telegram está vinculada correctamente con Contrata360.';

export class NotificationsController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly options: { botUsername: string }
  ) {}

  async createTelegramLinkCode(req: Request, res: Response): Promise<void> {
    const user = (req as any).user;
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    try {
      const { code, expiresAt } = await this.notificationService.createTelegramLinkCode(user.id);
      const botDeepLink = this.options.botUsername
        ? `https://t.me/${this.options.botUsername}?start=${code}`
        : null;

      res.status(200).json({ code, expiresAt: expiresAt.toISOString(), botDeepLink });
    } catch (error: any) {
      logger.error('Notifications endpoint error', { error: error?.message });
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  async sendTest(req: Request, res: Response): Promise<void> {
    const user = (req as any).user;
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    try {
      await this.notificationService.sendToUser(
        user.id,
        TEST_NOTIFICATION_MESSAGE,
        TEST_NOTIFICATION_TITLE
      );
      res.status(200).json({ delivered: true });
    } catch (error: any) {
      if (error instanceof NotificationChannelNotLinkedError) {
        res.status(409).json({ error: error.message, code: error.reason });
        return;
      }
      if (error instanceof NotificationDeliveryError) {
        logger.warn('Notification delivery failed', { userId: user.id, status: error.status });
        res.status(502).json({
          error: 'No se pudo entregar la notificación. Inténtalo de nuevo más tarde.',
          code: 'DELIVERY_FAILED',
        });
        return;
      }
      logger.error('Notifications endpoint error', { error: error?.message });
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}
