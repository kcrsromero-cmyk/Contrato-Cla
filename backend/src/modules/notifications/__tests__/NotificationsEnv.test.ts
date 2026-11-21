import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('dotenv', () => ({
  default: { config: () => ({}) },
  config: () => ({}),
}));

describe('env schema — notifications vars', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    process.env.REDIS_URL = 'redis://localhost:6379';
    process.env.SUPABASE_URL = 'http://localhost:8000';
    process.env.SUPABASE_PUBLISHABLE_KEY = 'anon';
    process.env.AUTH_JWKS_URL = 'http://localhost:8000';
    process.env.FRONTEND_URL = 'http://localhost:3000';
    process.env.SOCRATA_APP_TOKEN = 'test';
    process.env.SOCRATA_DATASET_URL = 'http://localhost';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it('exposes TELEGRAM_BOT_TOKEN, defaults APPRISE_URL and TELEGRAM_BOT_USERNAME', async () => {
    process.env.TELEGRAM_BOT_TOKEN = '123456:TEST';
    delete process.env.APPRISE_URL;
    delete process.env.TELEGRAM_BOT_USERNAME;
    delete process.env.PORT;

    const { config } = await import('../../../infrastructure/config/env');

    expect(config.TELEGRAM_BOT_TOKEN).toBe('123456:TEST');
    expect(config.APPRISE_URL).toBe('http://apprise:8000');
    expect(config.TELEGRAM_BOT_USERNAME).toBe('');
    expect(config.PORT).toBe('4000');
  });

  it('exits the process when TELEGRAM_BOT_TOKEN is empty', async () => {
    process.env.TELEGRAM_BOT_TOKEN = '';
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error('process.exit:' + code);
    }) as never);
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(import('../../../infrastructure/config/env')).rejects.toThrow('process.exit:1');

    exitSpy.mockRestore();
  });

  it('exits the process when APPRISE_URL is not a valid URL', async () => {
    process.env.TELEGRAM_BOT_TOKEN = '123456:TEST';
    process.env.APPRISE_URL = 'not-a-url';
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error('process.exit:' + code);
    }) as never);
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(import('../../../infrastructure/config/env')).rejects.toThrow('process.exit:1');

    exitSpy.mockRestore();
  });
});
