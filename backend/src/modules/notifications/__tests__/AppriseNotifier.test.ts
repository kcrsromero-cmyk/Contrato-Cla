import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AppriseNotifier } from '../infrastructure/AppriseNotifier';
import { NotificationDeliveryError } from '../domain/errors';

describe('AppriseNotifier', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const makeNotifier = () =>
    new AppriseNotifier({ baseUrl: 'http://apprise.test:8000/', botToken: 'TEST_TOKEN' });

  it('posts to /notify/ with the expected headers and body', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 200 }));

    await makeNotifier().send('123456789', 'hola', 'Contrata360');

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe('http://apprise.test:8000/notify/');
    expect(init?.method).toBe('POST');
    expect((init?.headers as Record<string, string>)['Content-Type']).toBe('application/json');
    expect(JSON.parse(init?.body as string)).toEqual({
      urls: 'tgram://TEST_TOKEN/123456789',
      body: 'hola',
      title: 'Contrata360',
    });
  });

  it('rejects with NotificationDeliveryError carrying the status when Apprise responds non-2xx', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 424 }));

    const error = await makeNotifier()
      .send('123456789', 'hola')
      .catch((e) => e);

    expect(error).toBeInstanceOf(NotificationDeliveryError);
    expect(error.status).toBe(424);
  });

  it('rejects with NotificationDeliveryError without leaking the token on a network error', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('network down'));

    const error = await makeNotifier()
      .send('123456789', 'hola')
      .catch((e) => e);

    expect(error).toBeInstanceOf(NotificationDeliveryError);
    expect(error.message).not.toContain('TEST_TOKEN');
  });

  it('rejects an invalid chat id without calling fetch', async () => {
    const error = await makeNotifier()
      .send('12/34', 'hola')
      .catch((e) => e);

    expect(error).toBeInstanceOf(NotificationDeliveryError);
    expect(fetch).not.toHaveBeenCalled();
  });
});
