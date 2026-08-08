/**
 * The outbox, run against an in-memory adapter.
 *
 * The same cases run against both real adapters in each app's own suite — one
 * spec, two storages, which is the lockstep proof the workstream asks for.
 * What is here is the logic neither platform owns.
 */
import {
  MAX_ATTEMPTS,
  OutboxKind,
  OutboxState,
  backoffMs,
  createOutbox,
  type OutboxEntry,
  type OutboxSender,
  type OutboxStorage,
} from "./outbox";

function memoryStorage(initial: OutboxEntry[] = []): OutboxStorage & { entries: OutboxEntry[] } {
  const state = { entries: [...initial] };
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

let clock = 1_000_000;
const now = (): number => clock;

beforeEach(() => {
  clock = 1_000_000;
});

describe("the backoff schedule", () => {
  it("doubles each attempt and stops at five minutes", () => {
    expect(backoffMs(0)).toBe(1_000);
    expect(backoffMs(1)).toBe(2_000);
    expect(backoffMs(4)).toBe(16_000);
    expect(backoffMs(8)).toBe(256_000);
    // 2^9 is 512s, past the cap.
    expect(backoffMs(9)).toBe(300_000);
    expect(backoffMs(30)).toBe(300_000);
  });
});

describe("a write that goes through", () => {
  it("is sent once and leaves the queue", async () => {
    const storage = memoryStorage();
    const send = jest.fn<ReturnType<OutboxSender>, [OutboxEntry]>(() => Promise.resolve());
    const outbox = createOutbox({ storage, send, now, newId: () => "entry-1" });

    await outbox.enqueue(OutboxKind.POST, { body: "مرحبا" });
    await outbox.flush();

    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0]![0]).toMatchObject({ id: "entry-1", kind: "POST" });
    expect(storage.entries).toEqual([]);
  });

  it("carries an id the sender can use as an idempotency key", async () => {
    const storage = memoryStorage();
    const seen: string[] = [];
    const outbox = createOutbox({
      storage,
      send: (entry) => {
        seen.push(entry.id);
        return Promise.resolve();
      },
      now,
    });

    const first = await outbox.enqueue(OutboxKind.POST, {});
    const second = await outbox.enqueue(OutboxKind.POST, {});
    await outbox.flush();

    expect(seen).toEqual([first.id, second.id]);
    expect(first.id).not.toBe(second.id);
  });

  it("sends oldest first", async () => {
    const storage = memoryStorage();
    const order: unknown[] = [];
    const outbox = createOutbox({
      storage,
      send: (entry) => {
        order.push(entry.payload);
        return Promise.resolve();
      },
      now,
    });

    await outbox.enqueue(OutboxKind.MESSAGE, "first");
    clock += 10;
    await outbox.enqueue(OutboxKind.MESSAGE, "second");
    await outbox.flush();

    // Order matters for messages, and a parallel flush on 2G is slower anyway.
    expect(order).toEqual(["first", "second"]);
  });
});

describe("a write that cannot get through", () => {
  it("backs off instead of hammering, and is skipped until it is due", async () => {
    const storage = memoryStorage();
    const send = jest.fn<ReturnType<OutboxSender>, [OutboxEntry]>(() =>
      Promise.reject(new Error("offline")),
    );
    const outbox = createOutbox({ storage, send, now });

    await outbox.enqueue(OutboxKind.POST, {});
    await outbox.flush();

    expect(send).toHaveBeenCalledTimes(1);
    expect(storage.entries[0]).toMatchObject({
      attempts: 1,
      state: OutboxState.QUEUED,
      lastError: "offline",
      nextAttemptAt: 1_000_000 + 2_000,
    });

    // Not due yet: flushing again must not spend another request.
    await outbox.flush();
    expect(send).toHaveBeenCalledTimes(1);

    clock += 2_000;
    await outbox.flush();
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("fails visibly after the last attempt rather than disappearing", async () => {
    const storage = memoryStorage();
    const send = jest.fn<ReturnType<OutboxSender>, [OutboxEntry]>(() =>
      Promise.reject(new Error("still offline")),
    );
    const outbox = createOutbox({ storage, send, now });

    await outbox.enqueue(OutboxKind.POST, { body: "نص" });
    for (let i = 0; i < MAX_ATTEMPTS; i += 1) {
      await outbox.flush();
      clock += 300_000;
    }

    expect(send).toHaveBeenCalledTimes(MAX_ATTEMPTS);
    // Still there. A post that vanished is indistinguishable from a product
    // that lost it.
    expect(storage.entries).toHaveLength(1);
    expect(storage.entries[0]).toMatchObject({
      state: OutboxState.FAILED,
      attempts: MAX_ATTEMPTS,
      payload: { body: "نص" },
    });

    // And a failed entry stops consuming requests.
    await outbox.flush();
    expect(send).toHaveBeenCalledTimes(MAX_ATTEMPTS);
  });

  it("gives up immediately when the server refuses it outright", async () => {
    // A closed job or a validation error will refuse the eighth attempt for
    // the same reason it refused the first. Spending seven more requests on a
    // 2G connection to learn that is the opposite of the point.
    const storage = memoryStorage();
    const send = jest.fn<ReturnType<OutboxSender>, [OutboxEntry]>(() => Promise.resolve(false));
    const outbox = createOutbox({ storage, send, now });

    await outbox.enqueue(OutboxKind.APPLICATION, {});
    await outbox.flush();

    expect(send).toHaveBeenCalledTimes(1);
    expect(storage.entries[0]).toMatchObject({ state: OutboxState.FAILED, attempts: 1 });
  });
});

describe("the tray", () => {
  it("retries a failed entry immediately, not after another backoff", async () => {
    const storage = memoryStorage();
    let fail = true;
    const outbox = createOutbox({
      storage,
      send: () => (fail ? Promise.reject(new Error("offline")) : Promise.resolve()),
      now,
    });

    const entry = await outbox.enqueue(OutboxKind.POST, {});
    for (let i = 0; i < MAX_ATTEMPTS; i += 1) {
      await outbox.flush();
      clock += 300_000;
    }
    expect(storage.entries[0]!.state).toBe(OutboxState.FAILED);

    fail = false;
    await outbox.retry(entry.id);
    // The member asked again; making them wait five minutes for a queue they
    // are looking at is absurd.
    expect(storage.entries[0]).toMatchObject({ state: OutboxState.QUEUED, attempts: 0 });

    await outbox.flush();
    expect(storage.entries).toEqual([]);
  });

  it("discards on request, and only the entry asked for", async () => {
    const storage = memoryStorage();
    const outbox = createOutbox({ storage, send: () => Promise.resolve(), now });

    const first = await outbox.enqueue(OutboxKind.POST, "a");
    await outbox.enqueue(OutboxKind.POST, "b");
    await outbox.discard(first.id);

    expect((await outbox.list()).map((e) => e.payload)).toEqual(["b"]);
  });

  it("tells subscribers when the queue changed", async () => {
    const storage = memoryStorage();
    const outbox = createOutbox({ storage, send: () => Promise.resolve(), now });
    const seen = jest.fn();
    const unsubscribe = outbox.subscribe(seen);

    await outbox.enqueue(OutboxKind.POST, {});
    expect(seen).toHaveBeenCalled();

    unsubscribe();
    const before = seen.mock.calls.length;
    await outbox.enqueue(OutboxKind.POST, {});
    expect(seen.mock.calls).toHaveLength(before);
  });
});

describe("concurrency", () => {
  it("does not lose an entry when two flushes overlap", async () => {
    // Read-modify-write on a shared array has no atomicity: without
    // serialisation the second writer wins with stale data and an entry
    // vanishes. That is the one bug an outbox may not have.
    const storage = memoryStorage();
    // A send that hangs until the test says so, so the enqueue below is
    // genuinely in flight while the flush holds the queue.
    let release = (): void => undefined;
    const inFlight = new Promise<void>((resolve) => {
      release = resolve;
    });
    let firstSend = true;
    const outbox = createOutbox({
      storage,
      send: () => {
        if (!firstSend) return Promise.resolve();
        firstSend = false;
        return inFlight;
      },
      now,
    });

    await outbox.enqueue(OutboxKind.POST, "a");
    const firstFlush = outbox.flush();
    const enqueueDuringFlush = outbox.enqueue(OutboxKind.POST, "b");

    // Let the flush reach `send` before releasing it.
    await Promise.resolve();
    release();
    await Promise.all([firstFlush, enqueueDuringFlush]);

    expect((await outbox.list()).map((e) => e.payload)).toEqual(["b"]);
  });
});
