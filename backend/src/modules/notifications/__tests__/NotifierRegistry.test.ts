import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Notifier } from '../domain/Notifier';
import {
  NotificationChannelNotLinkedError,
  NotificationDeliveryError,
} from '../domain/errors';

describe('NotifierRegistry', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('resolves the registered notifier by its default name', async () => {
    const { NotifierRegistry } = await import('../infrastructure/NotifierRegistry');
    const stub: Notifier = { send: vi.fn() };

    NotifierRegistry.register('apprise', stub);

    expect(NotifierRegistry.resolve()).toBe(stub);
    expect(NotifierRegistry.resolve('apprise')).toBe(stub);
  });

  it('throws when resolving an unregistered notifier name', async () => {
    const { NotifierRegistry } = await import('../infrastructure/NotifierRegistry');

    expect(() => NotifierRegistry.resolve('email')).toThrow(
      "Notifier 'email' is not registered."
    );
  });
});

describe('NotificationChannelNotLinkedError', () => {
  it('carries its reason and a fixed name', () => {
    const error = new NotificationChannelNotLinkedError('TELEGRAM_DISABLED');

    expect(error).toBeInstanceOf(Error);
    expect(error.reason).toBe('TELEGRAM_DISABLED');
    expect(error.name).toBe('NotificationChannelNotLinkedError');
  });
});

describe('NotificationDeliveryError', () => {
  it('carries an optional status', () => {
    const error = new NotificationDeliveryError('x', 424);

    expect(error).toBeInstanceOf(Error);
    expect(error.status).toBe(424);
  });
});
