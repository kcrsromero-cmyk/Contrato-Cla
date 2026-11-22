import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { listApiKeys, createApiKey, revokeApiKey } from '../api';

const jsonResponse = (body: unknown, ok = true, status = ok ? 200 : 400) => ({
  ok,
  status,
  json: async () => body,
});

describe('API key service functions', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', { getItem: vi.fn(() => 'fake-token') } as any);
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('listApiKeys sends the Authorization header and returns apiKeys', async () => {
    (fetch as any).mockResolvedValue(jsonResponse({ apiKeys: [{ id: '1', name: 'CI', keyPrefix: 'ck_live_AAAA', createdAt: '2026-01-01', lastUsedAt: null, revokedAt: null }] }));

    const result = await listApiKeys();

    expect(result).toEqual([{ id: '1', name: 'CI', keyPrefix: 'ck_live_AAAA', createdAt: '2026-01-01', lastUsedAt: null, revokedAt: null }]);
    const [url, options] = (fetch as any).mock.calls[0];
    expect(url).toContain('/auth/api-keys');
    expect(options.headers.Authorization).toBe('Bearer fake-token');
  });

  it('listApiKeys throws on a non-ok response', async () => {
    (fetch as any).mockResolvedValue(jsonResponse({ error: 'Forbidden: Requires USE_API capability' }, false, 403));

    await expect(listApiKeys()).rejects.toThrow('Forbidden: Requires USE_API capability');
  });

  it('createApiKey posts the trimmed-by-backend name and returns the issued key', async () => {
    const issued = { id: '1', name: 'CI', keyPrefix: 'ck_live_AAAA', createdAt: '2026-01-01', key: 'ck_live_xxx' };
    (fetch as any).mockResolvedValue(jsonResponse(issued, true, 201));

    const result = await createApiKey('CI');

    expect(result).toEqual(issued);
    const [url, options] = (fetch as any).mock.calls[0];
    expect(url).toContain('/auth/api-keys');
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toEqual({ name: 'CI' });
  });

  it('createApiKey surfaces the backend 429 message', async () => {
    (fetch as any).mockResolvedValue(jsonResponse({ error: 'Demasiadas solicitudes de administración de claves de API. Intenta de nuevo en un minuto.' }, false, 429));

    await expect(createApiKey('CI')).rejects.toThrow('Demasiadas solicitudes de administración de claves de API. Intenta de nuevo en un minuto.');
  });

  it('revokeApiKey sends DELETE to /auth/api-keys/:id and returns the summary', async () => {
    const summary = { id: '1', name: 'CI', keyPrefix: 'ck_live_AAAA', createdAt: '2026-01-01', lastUsedAt: null, revokedAt: '2026-01-02' };
    (fetch as any).mockResolvedValue(jsonResponse(summary));

    const result = await revokeApiKey('1');

    expect(result).toEqual(summary);
    const [url, options] = (fetch as any).mock.calls[0];
    expect(url).toContain('/auth/api-keys/1');
    expect(options.method).toBe('DELETE');
  });

  it('revokeApiKey surfaces the backend 404 message', async () => {
    (fetch as any).mockResolvedValue(jsonResponse({ error: 'Clave de API no encontrada.', code: 'API_KEY_NOT_FOUND' }, false, 404));

    await expect(revokeApiKey('missing')).rejects.toThrow('Clave de API no encontrada.');
  });
});
