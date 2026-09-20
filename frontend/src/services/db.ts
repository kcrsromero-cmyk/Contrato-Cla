interface CacheItem<T> {
  key: string;
  value: T;
  expiresAt: number; // millisecond timestamp
}

export class CacheService {
  private static DB_NAME = 'contrata360_cache';
  private static STORE_NAME = 'queries_cache';
  private static VERSION = 1;

  private static openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          db.createObjectStore(this.STORE_NAME, { keyPath: 'key' });
        }
      };
    });
  }

  /**
   * Sets an item in the IndexedDB cache with a specific Time To Live (TTL) in milliseconds.
   */
  public static async set<T>(key: string, value: T, ttlMs: number): Promise<void> {
    try {
      const db = await this.openDB();
      const expiresAt = Date.now() + ttlMs;
      const item: CacheItem<T> = { key, value, expiresAt };

      return new Promise((resolve, reject) => {
        const transaction = db.transaction(this.STORE_NAME, 'readwrite');
        const store = transaction.objectStore(this.STORE_NAME);
        const request = store.put(item);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.warn('Cache write failed:', e);
    }
  }

  /**
   * Retrieves an item from the IndexedDB cache. Returns null if expired or not found (unless ignoreExpiration is true).
   */
  public static async get<T>(key: string, ignoreExpiration: boolean = false): Promise<T | null> {
    try {
      const db = await this.openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(this.STORE_NAME, 'readonly');
        const store = transaction.objectStore(this.STORE_NAME);
        const request = store.get(key);

        request.onsuccess = () => {
          const item = request.result as CacheItem<T> | undefined;
          if (!item) {
            resolve(null);
            return;
          }

          if (!ignoreExpiration && Date.now() > item.expiresAt) {
            // Async delete expired item
            this.delete(key);
            resolve(null);
          } else {
            resolve(item.value);
          }
        };
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.warn('Cache read failed:', e);
      return null;
    }
  }

  /**
   * Deletes a cache key.
   */
  public static async delete(key: string): Promise<void> {
    try {
      const db = await this.openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(this.STORE_NAME, 'readwrite');
        const store = transaction.objectStore(this.STORE_NAME);
        const request = store.delete(key);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.warn('Cache delete failed:', e);
    }
  }

  /**
   * Clears all cache items.
   */
  public static async clear(): Promise<void> {
    try {
      const db = await this.openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(this.STORE_NAME, 'readwrite');
        const store = transaction.objectStore(this.STORE_NAME);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.warn('Cache clear failed:', e);
    }
  }

  /**
   * Calculates the total size of the IndexedDB store in bytes.
   */
  public static async getDatabaseSize(): Promise<number> {
    try {
      const db = await this.openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(this.STORE_NAME, 'readonly');
        const store = transaction.objectStore(this.STORE_NAME);
        const request = store.openCursor();
        let totalBytes = 0;

        request.onsuccess = (event: any) => {
          const cursor = event.target.result;
          if (cursor) {
            const item = cursor.value;
            try {
              const serialized = JSON.stringify(item);
              totalBytes += serialized.length;
            } catch (e) {
              // Ignore serialization errors
            }
            cursor.continue();
          } else {
            resolve(totalBytes);
          }
        };

        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.warn('Failed to calculate DB size:', e);
      return 0;
    }
  }
}
