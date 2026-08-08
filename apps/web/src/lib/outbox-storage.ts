"use client";

import type {
  OfflineCacheEntry,
  OfflineCacheStorage,
  OutboxEntry,
  OutboxStorage,
} from "@baydar/shared";

/**
 * The browser half of the outbox: where the queue lives.
 *
 * IndexedDB rather than `localStorage`, for one reason that matters here — a
 * queued post can carry media refs and a few kilobytes of Arabic body, and
 * `localStorage` is a 5 MB origin-wide budget shared with everything else,
 * which fails by throwing mid-write and losing the entry. Its synchronous API
 * also blocks the main thread on every flush.
 *
 * One record holding the whole array, not a row per entry. The queue is tens
 * of items, every operation rewrites all of them anyway, and a single record
 * is atomic — a partial write of a queue is the failure this exists to avoid.
 *
 * No dependency: `indexedDB` is a platform feature. The wrapper is small
 * because it does one thing.
 */

const DB_NAME = "baydar";
const DB_VERSION = 1;
const STORE = "outbox";
const RECORD_KEY = "queue";
/** The offline read cache shares the store; it is the same durability need. */
const CACHE_RECORD_KEY = "offline-cache";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("indexedDB open failed"));
  });
}

function transact<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>) {
  return openDatabase().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const request = work(tx.objectStore(STORE));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error("indexedDB request failed"));
        tx.oncomplete = () => db.close();
      }),
  );
}

/**
 * A storage that reads empty and writes nowhere.
 *
 * Private browsing and locked-down profiles can refuse IndexedDB outright.
 * Losing the durability guarantee there is bad; refusing to let the member
 * post at all is worse, so the queue degrades to send-once-and-report rather
 * than throwing out of every composer.
 */
const NULL_STORAGE: OutboxStorage = {
  read: () => Promise.resolve([]),
  write: () => Promise.resolve(),
};

/**
 * The offline read cache, in the same object store.
 *
 * Same shape, same degradation, one database. A second IndexedDB just to hold
 * a second array would double the open/upgrade paths for no benefit.
 */
export function createWebOfflineCacheStorage(): OfflineCacheStorage {
  if (typeof indexedDB === "undefined")
    return { read: () => Promise.resolve([]), write: () => Promise.resolve() };

  return {
    async read(): Promise<OfflineCacheEntry[]> {
      try {
        const stored = await transact("readonly", (store) => store.get(CACHE_RECORD_KEY));
        return Array.isArray(stored) ? (stored as OfflineCacheEntry[]) : [];
      } catch {
        return [];
      }
    },
    async write(entries: OfflineCacheEntry[]): Promise<void> {
      try {
        await transact("readwrite", (store) => store.put(entries, CACHE_RECORD_KEY));
      } catch {
        // No cache is a slower product, not a broken one.
      }
    },
  };
}

export function createWebOutboxStorage(): OutboxStorage {
  if (typeof indexedDB === "undefined") return NULL_STORAGE;

  return {
    async read(): Promise<OutboxEntry[]> {
      try {
        const stored = await transact("readonly", (store) => store.get(RECORD_KEY));
        return Array.isArray(stored) ? (stored as OutboxEntry[]) : [];
      } catch {
        return [];
      }
    },

    async write(entries: OutboxEntry[]): Promise<void> {
      try {
        await transact("readwrite", (store) => store.put(entries, RECORD_KEY));
      } catch {
        // See NULL_STORAGE: a queue that cannot persist still sends.
      }
    },
  };
}
