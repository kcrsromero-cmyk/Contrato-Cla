import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../../infrastructure/config/env', () => ({
  config: { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_PUBLISHABLE_KEY: 'TEST_ANON_KEY' },
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ auth: {} })),
}));

import { SupabaseIdentityProvider } from '../infrastructure/SupabaseIdentityProvider';

describe('SupabaseIdentityProvider', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('logout', () => {
    it('revokes the session tied to the given token, not whatever the shared client holds', async () => {
      vi.mocked(fetch).mockResolvedValue({ ok: true, status: 200 } as any);
      const provider = new SupabaseIdentityProvider();

      await provider.logout('specific-user-token');

      const [url, init] = vi.mocked(fetch).mock.calls[0];
      expect(String(url)).toBe('https://example.supabase.co/auth/v1/logout?scope=global');
      expect(init?.headers).toMatchObject({
        apikey: 'TEST_ANON_KEY',
        Authorization: 'Bearer specific-user-token',
      });
    });

    it('stays idempotent when the token is already expired (401)', async () => {
      vi.mocked(fetch).mockResolvedValue({ ok: false, status: 401 } as any);
      const provider = new SupabaseIdentityProvider();

      await expect(provider.logout('expired-token')).resolves.toBeUndefined();
    });

    it('throws on an unexpected provider error', async () => {
      vi.mocked(fetch).mockResolvedValue({ ok: false, status: 500 } as any);
      const provider = new SupabaseIdentityProvider();

      await expect(provider.logout('some-token')).rejects.toThrow('500');
    });
  });

  describe('refresh', () => {
    it('exchanges the given refresh token directly, without touching the shared client session', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: 'new-access',
          refresh_token: 'new-refresh',
          expires_in: 3600,
          user: { id: 'user-1', email: 'a@b.com' },
        }),
      } as any);
      const provider = new SupabaseIdentityProvider();

      const result = await provider.refresh('old-refresh-token');

      const [url, init] = vi.mocked(fetch).mock.calls[0];
      expect(String(url)).toBe('https://example.supabase.co/auth/v1/token?grant_type=refresh_token');
      expect(JSON.parse(init?.body as string)).toEqual({ refresh_token: 'old-refresh-token' });
      expect(result.accessToken).toBe('new-access');
      expect(result.refreshToken).toBe('new-refresh');
    });

    it('throws when the provider rejects the refresh token', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        json: async () => ({ error_description: 'Invalid Refresh Token' }),
      } as any);
      const provider = new SupabaseIdentityProvider();

      await expect(provider.refresh('bad-token')).rejects.toThrow('Invalid Refresh Token');
    });
  });
});
