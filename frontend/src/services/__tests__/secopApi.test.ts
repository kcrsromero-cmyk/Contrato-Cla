import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SecopApiService } from '../secopApi';
import { CacheService } from '../db';

// Mock CacheService
vi.mock('../db', () => ({
  CacheService: {
    get: vi.fn(),
    set: vi.fn(),
  },
}));

describe('SecopApiService', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('getContratos', () => {
    it('should paginate correctly by incrementing offset until less than limit is returned', async () => {
      // Mock CacheService to return null (cache miss)
      (CacheService.get as any).mockResolvedValue(null);

      // Create dummy responses
      const makePage = (size: number, startIndex: number) => {
        return Array.from({ length: size }).map((_, i) => ({
          id_contrato: `ID-${startIndex + i}`,
          valor_del_contrato: '1000',
        }));
      };

      // The frontend no longer paginates, the backend does.
      // So the mock just returns all the data from the backend.
      const allData = makePage(7000, 0);

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => allData,
        });

      const contratos = await SecopApiService.getContratos('ENT123', '2023-01-01', '2023-12-31', true);

      // Total should be 7000 unique records
      expect(contratos.length).toBe(7000);
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Check url matches backend API
      const firstCallUrl = (global.fetch as any).mock.calls[0][0];
      expect(firstCallUrl).toContain('http://localhost:4000/api/v1/contracts');
    });

    it('should return stale data from cache when fetch fails', async () => {
      // Setup network error
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      // Setup cache to return stale data when ignoreExpiration is true
      const staleData = [{ id_contrato: 'OLD-1' }];
      (CacheService.get as any).mockImplementation(async (key: string, ignoreExp: boolean) => {
        if (ignoreExp) return staleData;
        return null;
      });

      const contratos = await SecopApiService.getContratos('ENT123', '2023-01-01', '2023-12-31', true);

      expect(contratos).toEqual(staleData);
      expect(CacheService.get).toHaveBeenCalledWith(expect.stringContaining('contratos_raw'), true);
    });

    it('should retry on 429 Too Many Requests', async () => {
      (CacheService.get as any).mockResolvedValue(null);

      const goodData = [{ id_contrato: 'OK-1' }];

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          status: 429,
          ok: false,
          json: async () => ({})
        })
        .mockResolvedValueOnce({
          status: 200,
          ok: true,
          json: async () => goodData
        });

      // To avoid waiting for real setTimeout in tests, mock timers
      vi.useFakeTimers();

      const promise = SecopApiService.getContratos('ENT123', '2023-01-01', '2023-12-31', true);

      // Fast-forward timers
      await vi.runAllTimersAsync();

      const result = await promise;

      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(result.length).toBe(1);
      expect(result[0].id_contrato).toBe('OK-1');

      vi.useRealTimers();
    });
  });
});
