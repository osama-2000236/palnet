// What the product can still show with no connection at all.
//
// 39% of Palestinians have no internet access and 64% of Gaza's towers are
// offline, so "offline" here is not airplane mode on a train — it is the
// ordinary state of the network for a large share of the people this is for.
//
// The rule is stale-while-revalidate: serve what was last read, immediately,
// and replace it when a request succeeds. The one thing that must come with it
// is «آخر تحديث» — stale data presented as live is worse than no data, because
// a member acts on it.
//
// One implementation, the same two storage adapters the outbox uses. On web
// that is IndexedDB; on mobile a JSON file. A service worker would cache the
// same responses on one platform only and leave mobile needing this anyway —
// see GAP-07 for what that costs and what it does not.

export interface OfflineCacheEntry {
  key: string;
  body: unknown;
  /** When the value was fetched. Rendered as «آخر تحديث». */
  storedAt: number;
  /** Last read or write, for eviction. */
  touchedAt: number;
  /** Serialized size, so the ceiling is measured rather than guessed. */
  bytes: number;
}

export interface OfflineCacheStorage {
  read(): Promise<OfflineCacheEntry[]>;
  write(entries: OfflineCacheEntry[]): Promise<void>;
}

export interface OfflineCache {
  get<T = unknown>(key: string): Promise<{ body: T; storedAt: number } | null>;
  put(key: string, body: unknown): Promise<void>;
  /** Everything currently held, newest touch first. Mostly for diagnostics. */
  list(): Promise<OfflineCacheEntry[]>;
  clear(): Promise<void>;
}

/**
 * 40 MB. Generous for text, and deliberately not unbounded: a cache that grows
 * without a ceiling eventually gets evicted by the operating system, which
 * takes the whole thing rather than the oldest part of it.
 */
export const OFFLINE_CACHE_MAX_BYTES = 40 * 1024 * 1024;

/**
 * The surfaces worth keeping. Anything not on this list is not cached, which
 * is the point — a cache of everything is a cache nobody can reason about.
 */
export const offlineCacheKeys = {
  feed: "feed",
  me: "profile:me",
  rooms: "messaging:rooms",
  roomMessages: (roomId: string) => `messaging:room:${roomId}`,
  savedJobs: "jobs:saved",
  learningPath: (pathId: string) => `learning:path:${pathId}`,
} as const;

export interface OfflineCacheOptions {
  storage: OfflineCacheStorage;
  maxBytes?: number;
  now?: () => number;
}

export function createOfflineCache(options: OfflineCacheOptions): OfflineCache {
  const { storage } = options;
  const maxBytes = options.maxBytes ?? OFFLINE_CACHE_MAX_BYTES;
  const now = options.now ?? (() => Date.now());

  // One promise chain, for the reason the outbox has one: read-modify-write on
  // a shared array loses an entry, and here that means a member sees an older
  // page than the one they already had.
  let chain: Promise<unknown> = Promise.resolve();
  const serialize = <T>(work: () => Promise<T>): Promise<T> => {
    const next = chain.then(work, work);
    chain = next.catch(() => undefined);
    return next;
  };

  /**
   * Evict least-recently-touched entries until the total fits.
   *
   * A single value larger than the whole budget is dropped rather than kept:
   * storing it would evict everything else to hold one thing.
   */
  function fit(entries: OfflineCacheEntry[]): OfflineCacheEntry[] {
    const ordered = [...entries].sort((a, b) => b.touchedAt - a.touchedAt);
    const kept: OfflineCacheEntry[] = [];
    let total = 0;
    for (const entry of ordered) {
      if (entry.bytes > maxBytes) continue;
      if (total + entry.bytes > maxBytes) break;
      kept.push(entry);
      total += entry.bytes;
    }
    return kept;
  }

  return {
    get<T>(key: string) {
      return serialize(async () => {
        const entries = await storage.read();
        const hit = entries.find((entry) => entry.key === key);
        if (!hit) return null;
        // Touch on read: a page the member opens every morning should outlive
        // one they cached once and never returned to.
        await storage.write(
          entries.map((entry) => (entry.key === key ? { ...entry, touchedAt: now() } : entry)),
        );
        return { body: hit.body as T, storedAt: hit.storedAt };
      });
    },

    put(key: string, body: unknown) {
      return serialize(async () => {
        const serialized = JSON.stringify(body ?? null);
        const entry: OfflineCacheEntry = {
          key,
          body,
          storedAt: now(),
          touchedAt: now(),
          bytes: serialized.length,
        };
        const rest = (await storage.read()).filter((existing) => existing.key !== key);
        await storage.write(fit([entry, ...rest]));
      });
    },

    list() {
      return storage
        .read()
        .then((entries) => [...entries].sort((a, b) => b.touchedAt - a.touchedAt));
    },

    clear() {
      return serialize(() => storage.write([]));
    },
  };
}

/**
 * Read through the cache: serve what is stored, then replace it.
 *
 * Returns the stored value with `stale: true` when the request fails, so the
 * caller can render «آخر تحديث» rather than an error page over data the member
 * can already see. A failure with nothing cached is still a failure.
 */
export async function readThrough<T>(
  cache: OfflineCache,
  key: string,
  fetcher: () => Promise<T>,
): Promise<{ body: T; storedAt: number; stale: boolean }> {
  try {
    const body = await fetcher();
    await cache.put(key, body);
    return { body, storedAt: Date.now(), stale: false };
  } catch (error: unknown) {
    const cached = await cache.get<T>(key);
    if (!cached) throw error;
    return { body: cached.body, storedAt: cached.storedAt, stale: true };
  }
}
