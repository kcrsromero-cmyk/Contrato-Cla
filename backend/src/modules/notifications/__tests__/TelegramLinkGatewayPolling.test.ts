import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TelegramLinkGateway } from '../infrastructure/TelegramLinkGateway';

vi.mock('../../../infrastructure/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

describe('TelegramLinkGateway polling', () => {
  let prisma: { user: { findUnique: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> } };
  let fetchImpl: ReturnType<typeof vi.fn>;
  let gateway: TelegramLinkGateway;

  beforeEach(() => {
    prisma = { user: { findUnique: vi.fn(), update: vi.fn() } };
    fetchImpl = vi.fn();
    gateway = new TelegramLinkGateway({
      prisma: prisma as any,
      botToken: 'TEST_TOKEN',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
  });

  it('requests getUpdates with offset=0 on the first poll', async () => {
    fetchImpl.mockResolvedValue(jsonResponse({ ok: true, result: [] }));

    await gateway.pollOnce();

    const [url] = fetchImpl.mock.calls[0];
    const parsed = new URL(url as string);
    expect(parsed.hostname).toBe('api.telegram.org');
    expect(parsed.pathname).toBe('/botTEST_TOKEN/getUpdates');
    expect(parsed.searchParams.get('offset')).toBe('0');
    expect(parsed.searchParams.get('timeout')).toBe('25');
    expect(parsed.searchParams.get('allowed_updates')).toBe('["message"]');
  });

  it('passes each update to handleUpdate in order and advances the offset', async () => {
    const handleUpdateSpy = vi.spyOn(gateway, 'handleUpdate').mockResolvedValue('ignored');
    fetchImpl.mockResolvedValueOnce(
      jsonResponse({
        ok: true,
        result: [
          { update_id: 41, message: { text: 'hola', chat: { id: 1 } } },
          { update_id: 42, message: { text: 'hola', chat: { id: 1 } } },
        ],
      })
    );

    await gateway.pollOnce();

    expect(handleUpdateSpy).toHaveBeenNthCalledWith(1, expect.objectContaining({ update_id: 41 }));
    expect(handleUpdateSpy).toHaveBeenNthCalledWith(2, expect.objectContaining({ update_id: 42 }));

    fetchImpl.mockResolvedValueOnce(jsonResponse({ ok: true, result: [] }));
    await gateway.pollOnce();
    const [secondUrl] = fetchImpl.mock.calls[1];
    expect(new URL(secondUrl as string).searchParams.get('offset')).toBe('43');
  });

  it('rejects with a non-200 error that never contains the bot token, and never calls handleUpdate', async () => {
    const handleUpdateSpy = vi.spyOn(gateway, 'handleUpdate');
    fetchImpl.mockResolvedValue(jsonResponse({}, 409));

    const error = await gateway.pollOnce().catch((e) => e);

    expect(error.message).toContain('409');
    expect(error.message).not.toContain('TEST_TOKEN');
    expect(handleUpdateSpy).not.toHaveBeenCalled();
  });

  it('keeps processing later updates and advances offset even when one handleUpdate throws', async () => {
    vi.spyOn(gateway, 'handleUpdate')
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce('ignored');
    fetchImpl.mockResolvedValueOnce(
      jsonResponse({
        ok: true,
        result: [
          { update_id: 41, message: { text: 'hola', chat: { id: 1 } } },
          { update_id: 42, message: { text: 'hola', chat: { id: 1 } } },
        ],
      })
    );

    await gateway.pollOnce();

    fetchImpl.mockResolvedValueOnce(jsonResponse({ ok: true, result: [] }));
    await gateway.pollOnce();
    const [secondUrl] = fetchImpl.mock.calls[1];
    expect(new URL(secondUrl as string).searchParams.get('offset')).toBe('43');
  });

  it('aborts the in-flight request and resolves when stop() is called', async () => {
    let capturedSignal: AbortSignal | undefined;
    fetchImpl.mockImplementation(
      (_url: string, init?: { signal?: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          capturedSignal = init?.signal;
          init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
        })
    );

    gateway.start();
    await vi.waitFor(() => expect(capturedSignal).toBeDefined());

    await gateway.stop();

    expect(capturedSignal?.aborted).toBe(true);
  });

  it('retries getUpdates after the error backoff', async () => {
    const backoffGateway = new TelegramLinkGateway({
      prisma: prisma as any,
      botToken: 'TEST_TOKEN',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      errorBackoffMs: 1,
    });
    fetchImpl
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValue(jsonResponse({ ok: true, result: [] }));

    backoffGateway.start();

    await vi.waitFor(() => expect(fetchImpl.mock.calls.length).toBeGreaterThanOrEqual(2));

    await backoffGateway.stop();
  });
});
