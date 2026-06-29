/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AssetChunk } from '../types';

/**
 * Service managing client-side IndexedDB persistence for document binary payloads
 * and extracted semantic text chunks.
 */
export class IndexedDBService {
  private static readonly DB_NAME = 'cfa_os_knowledge_vault';
  private static readonly DB_VERSION = 1;
  private static readonly BINARY_STORE = 'assets_binary';
  private static readonly CHUNKS_STORE = 'assets_chunks';
  private db: IDBDatabase | null = null;

  private async getDb(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(IndexedDBService.DB_NAME, IndexedDBService.DB_VERSION);

      request.onupgradeneeded = (e) => {
        const db = request.result;
        if (!db.objectStoreNames.contains(IndexedDBService.BINARY_STORE)) {
          db.createObjectStore(IndexedDBService.BINARY_STORE, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(IndexedDBService.CHUNKS_STORE)) {
          db.createObjectStore(IndexedDBService.CHUNKS_STORE, { keyPath: 'id' });
        }
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Stores raw document binary data (Blob) securely in IndexedDB.
   */
  public async storeBinary(assetId: string, blob: Blob, filename: string): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(IndexedDBService.BINARY_STORE, 'readwrite');
      const store = transaction.objectStore(IndexedDBService.BINARY_STORE);
      const request = store.put({ id: assetId, blob, filename, size: blob.size });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Retrieves the raw document binary data from IndexedDB.
   */
  public async getBinary(assetId: string): Promise<{ blob: Blob; filename: string } | null> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(IndexedDBService.BINARY_STORE, 'readonly');
      const store = transaction.objectStore(IndexedDBService.BINARY_STORE);
      const request = store.get(assetId);

      request.onsuccess = () => {
        const result = request.result;
        if (result) {
          resolve({ blob: result.blob, filename: result.filename });
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Deletes raw document binary data from IndexedDB.
   */
  public async deleteBinary(assetId: string): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(IndexedDBService.BINARY_STORE, 'readwrite');
      const store = transaction.objectStore(IndexedDBService.BINARY_STORE);
      const request = store.delete(assetId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Stores parsed structural chunks associated with an asset.
   */
  public async storeChunks(assetId: string, chunks: AssetChunk[]): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(IndexedDBService.CHUNKS_STORE, 'readwrite');
      const store = transaction.objectStore(IndexedDBService.CHUNKS_STORE);
      const request = store.put({ id: assetId, chunks });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Retrieves parsed chunks associated with an asset.
   */
  public async getChunks(assetId: string): Promise<AssetChunk[]> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(IndexedDBService.CHUNKS_STORE, 'readonly');
      const store = transaction.objectStore(IndexedDBService.CHUNKS_STORE);
      const request = store.get(assetId);

      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.chunks : []);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Deletes chunks associated with an asset.
   */
  public async deleteChunks(assetId: string): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(IndexedDBService.CHUNKS_STORE, 'readwrite');
      const store = transaction.objectStore(IndexedDBService.CHUNKS_STORE);
      const request = store.delete(assetId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Computes the total storage used by all raw files in bytes.
   */
  public async getStorageUsedBytes(): Promise<number> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(IndexedDBService.BINARY_STORE, 'readonly');
      const store = transaction.objectStore(IndexedDBService.BINARY_STORE);
      const request = store.openCursor();
      let total = 0;

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          total += cursor.value.size || 0;
          cursor.continue();
        } else {
          resolve(total);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }
}

export const indexedDBService = new IndexedDBService();
