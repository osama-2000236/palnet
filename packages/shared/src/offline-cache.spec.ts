import {
  createOfflineCache,
  offlineCacheKeys,
  readThrough,
  type OfflineCacheEntry,
  type OfflineCacheStorage,
} from "./offline-cache";

function memoryStorage(): OfflineCacheStorage & { entries: OfflineCacheEntry[] } {
  const state = { entries: [] as OfflineCacheEntry[] };
  return {
    get entries() {
      return state.entries;
    },
    read: () => Promise.resolve([...state.entries]),
    write: (entries) => {
      state.entries = [...entries];
      return Promise.resolve();
    },
  };
}

let clock = 1_000;
const now = (): number => clock;
beforeEach(() => {
  clock = 1_000;
});

describe("what the cache holds", () => {
  it("gives back what was put, with when it was fetched", async () => {
    const cache = createOfflineCache({ storage: memoryStorage(), now });

    clock = 5_000;
    await cache.put(offlineCacheKeys.feed, { posts: ["منشور"] });

    clock = 9_000;
    expect(await cache.get(offlineCacheKeys.feed)).toEqual({
      body: { posts: ["منشور"] },
      // The fetch time, not the read time. «آخر تحديث» is about the data.
      storedAt: 5_000,
    });
  });

  it("replaces rather than accumulating on the same key", async () => {
    const storage = memoryStorage();
    const cache = createOfflineCache({ storage, now });

    await cache.put(offlineCacheKeys.feed, { page: 1 });
    await cache.put(offlineCacheKeys.feed, { page: 2 });

    expect(storage.entries).toHaveLength(1);
    expect((await cache.get<{ page: number }>(offlineCacheKeys.feed))?.body.page).toBe(2);
  });

  it("misses cleanly for a key it never held", async () => {
    const cache = createOfflineCache({ storage: memoryStorage(), now });
    expect(await cache.get("nothing")).toBeNull();
  });
});

describe("the ceiling", () => {
  it("evicts the least recently touched first", async () => {
    // Each body serializes to 28 bytes; the ceiling holds two, not three.
    const storage = memoryStorage();
    const cache = createOfflineCache({ storage, maxBytes: 57, now });

    clock = 1_000;
    await cache.put("a", { v: "x".repeat(20) });
    clock = 2_000;
    await cache.put("b", { v: "x".repeat(20) });

    // Reading "a" makes it the freshest, so "b" is what goes.
    clock = 3_000;
    await cache.get("a");

    clock = 4_000;
    await cache.put("c", { v: "x".repeat(20) });

    const keys = storage.entries.map((entry) => entry.key).sort();
    expect(keys).toEqual(["a", "c"]);
  });

  it("refuses a single value larger than the whole budget", async () => {
    // Keeping it would evict everything else to hold one thing.
    const storage = memoryStorage();
    const cache = createOfflineCache({ storage, maxBytes: 50, now });

    await cache.put("small", { v: "x" });
    await cache.put("huge", { v: "x".repeat(500) });

    expect(storage.entries.map((e) => e.key)).toEqual(["small"]);
  });

  it("never exceeds the ceiling it was given", async () => {
    const storage = memoryStorage();
    const cache = createOfflineCache({ storage, maxBytes: 200, now });

    for (let i = 0; i < 20; i += 1) {
      clock += 10;
      await cache.put(`k${i}`, { v: "x".repeat(30) });
    }

    const total = storage.entries.reduce((sum, entry) => sum + entry.bytes, 0);
    expect(total).toBeLessThanOrEqual(200);
    expect(storage.entries.length).toBeGreaterThan(0);
  });
});

describe("reading through", () => {
  it("serves the network and remembers it", async () => {
    const cache = createOfflineCache({ storage: memoryStorage(), now });

    const out = await readThrough(cache, offlineCacheKeys.rooms, () =>
      Promise.resolve({ rooms: 3 }),
    );

    expect(out).toMatchObject({ body: { rooms: 3 }, stale: false });
    expect((await cache.get(offlineCacheKeys.rooms))?.body).toEqual({ rooms: 3 });
  });

  it("serves the last good copy when the request fails, and says it is stale", async () => {
    // The whole point: a member on a dead 2G link sees their rooms, not an
    // error page over data their phone already has.
    const cache = createOfflineCache({ storage: memoryStorage(), now });
    clock = 7_000;
    await cache.put(offlineCacheKeys.rooms, { rooms: 3 });

    const out = await readThrough(cache, offlineCacheKeys.rooms, () =>
      Promise.reject(new Error("offline")),
    );

    expect(out).toEqual({ body: { rooms: 3 }, storedAt: 7_000, stale: true });
  });

  it("still fails when there is nothing cached", async () => {
    // A blank screen with a retry is honest. Inventing an empty feed is not.
    const cache = createOfflineCache({ storage: memoryStorage(), now });

    await expect(
      readThrough(cache, offlineCacheKeys.feed, () => Promise.reject(new Error("offline"))),
    ).rejects.toThrow("offline");
  });
});
