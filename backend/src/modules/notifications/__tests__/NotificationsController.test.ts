import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  NotificationsController,
  TEST_NOTIFICATION_MESSAGE,
  TEST_NOTIFICATION_TITLE,
} from '../presentation/NotificationsController';
import { NotificationChannelNotLinkedError, NotificationDeliveryError } from '../domain/errors';

vi.mock('../../../infrastructure/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe('NotificationsController', () => {
  let service: { createTelegramLinkCode: ReturnType<typeof vi.fn>; sendToUser: ReturnType<typeof vi.fn> };
  let req: any;
  let res: any;

  beforeEach(() => {
    service = { createTelegramLinkCode: vi.fn(), sendToUser: vi.fn() };
    req = { user: { id: 'user-1' } };
    res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
  });

  describe('createTelegramLinkCode', () => {
    it('responds 401 and never calls the service when there is no user', async () => {
      req.user = undefined;
      const controller = new NotificationsController(service as any, { botUsername: '' });

      await controller.createTelegramLinkCode(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
      expect(service.createTelegramLinkCode).not.toHaveBeenCalled();
    });

    it('responds 200 with the code and a bot deep link', async () => {
      service.createTelegramLinkCode.mockResolvedValue({
        code: 'ABCD2345',
        expiresAt: new Date('2026-11-20T10:15:00.000Z'),
      });
      const controller = new NotificationsController(service as any, {
        botUsername: 'ContrataTestBot',
      });

      await controller.createTelegramLinkCode(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        code: 'ABCD2345',
        expiresAt: '2026-11-20T10:15:00.000Z',
        botDeepLink: 'https://t.me/ContrataTestBot?start=ABCD2345',
      });
    });

    it('responds with botDeepLink null when no bot username is configured', async () => {
      service.createTelegramLinkCode.mockResolvedValue({
        code: 'ABCD2345',
        expiresAt: new Date('2026-11-20T10:15:00.000Z'),
      });
      const controller = new NotificationsController(service as any, { botUsername: '' });

      await controller.createTelegramLinkCode(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ botDeepLink: null })
      );
    });
  });

  describe('sendTest', () => {
    it('responds 409 with the reason code when the channel is not linked', async () => {
      service.sendToUser.mockRejectedValue(
        new NotificationChannelNotLinkedError('TELEGRAM_NOT_LINKED')
      );
      const controller = new NotificationsController(service as any, { botUsername: '' });

      await controller.sendTest(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      const body = res.json.mock.calls[0][0];
      expect(body.code).toBe('TELEGRAM_NOT_LINKED');
      expect(typeof body.error).toBe('string');
      expect(body.error.length).toBeGreaterThan(0);
    });

    it('responds 502 with DELIVERY_FAILED on a delivery error', async () => {
      service.sendToUser.mockRejectedValue(new NotificationDeliveryError('Apprise responded 502', 502));
      const controller = new NotificationsController(service as any, { botUsername: '' });

      await controller.sendTest(req, res);

      expect(res.status).toHaveBeenCalledWith(502);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'DELIVERY_FAILED' })
      );
    });

    it('calls sendToUser with the fixed test message and responds 200', async () => {
      service.sendToUser.mockResolvedValue(undefined);
      const controller = new NotificationsController(service as any, { botUsername: '' });

      await controller.sendTest(req, res);

      expect(service.sendToUser).toHaveBeenCalledWith(
        'user-1',
        TEST_NOTIFICATION_MESSAGE,
        TEST_NOTIFICATION_TITLE
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ delivered: true });
    });
  });
});
