import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CacheService } from '../db';
import 'fake-indexeddb/auto'; // Optional, might need to install fake-indexeddb if native indexedDB not available in node. Or we can just mock the whole thing for the purpose of this test if we prefer not to add more dependencies.

// Since IndexedDB is not natively available in Node.js (which Vitest runs on by default),
// we will mock IndexedDB.

const mockStore = new Map();

vi.spyOn(CacheService as any, 'openDB').mockImplementation(async () => {
    return {} as IDBDatabase; // dummy
});

// We can just test the logic inside CacheService by mocking the internal db calls,
// OR since it's testing the IDB logic itself, the best is to mock indexeddb globals or just write a logical test.

// Actually, since indexeddb is tough to mock perfectly without `fake-indexeddb`,
// let's directly mock the store interactions if possible.

// But wait, it's easier to just mock the inner promise returns of `get` and `set`?
// No, the requirement is to test the logic in `get` when a value is expired.

// Let's mock Date.now()
describe('CacheService', () => {
  let dateNowMock: any;

  beforeEach(() => {
    // Reset our mock store
    mockStore.clear();
    dateNowMock = vi.spyOn(Date, 'now').mockReturnValue(1000000);

    // Mock openDB
    vi.spyOn(CacheService as any, 'openDB').mockResolvedValue({
      transaction: () => ({
        objectStore: () => ({
          put: (item: any) => {
            mockStore.set(item.key, item);
            return {
              set onsuccess(cb: any) { cb(); },
              set onerror(cb: any) { },
            };
          },
          get: (key: string) => {
            return {
              get result() { return mockStore.get(key); },
              set onsuccess(cb: any) { cb(); },
              set onerror(cb: any) { },
            };
          },
          delete: (key: string) => {
            mockStore.delete(key);
            return {
              set onsuccess(cb: any) { cb(); },
              set onerror(cb: any) { },
            };
          }
        })
      })
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return null if item is expired and ignoreExpiration is false', async () => {
    // Insert an item that expired at time 500000 (currently time is 1000000)
    mockStore.set('test-key', {
      key: 'test-key',
      value: 'test-value',
      expiresAt: 500000
    });

    const result = await CacheService.get('test-key');
    expect(result).toBeNull();
    // It should also have deleted the item
    expect(mockStore.has('test-key')).toBe(false);
  });

  it('should return the item if it is expired but ignoreExpiration is true', async () => {
    // Insert an item that expired at time 500000
    mockStore.set('test-key', {
      key: 'test-key',
      value: 'test-value',
      expiresAt: 500000
    });

    const result = await CacheService.get('test-key', true);
    expect(result).toBe('test-value');
    // It should NOT have deleted the item
    expect(mockStore.has('test-key')).toBe(true);
  });

  it('should return the item if it is not expired', async () => {
    // Insert an item that expires at time 2000000
    mockStore.set('test-key', {
      key: 'test-key',
      value: 'test-value',
      expiresAt: 2000000
    });

    const result = await CacheService.get('test-key');
    expect(result).toBe('test-value');
  });
});
