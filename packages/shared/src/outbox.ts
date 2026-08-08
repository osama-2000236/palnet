// The outbox: writes that survive the connection dropping.
//
// Four actions are durable, because losing any of them costs a member
// something real — publishing a post, sending a message, submitting a job
// application, and confirming a work proof. Everything else may fail and be
// retried by hand.
//
// One implementation, two storage adapters. The queue logic, the retry
// schedule and the idempotency key all live here; the platforms differ only in
// where the bytes go. That split is what stops web and mobile from growing two
// different definitions of "sent".
//
// Nothing is ever dropped silently. After the last attempt an entry becomes
// `failed` and appears in a tray the member can see, retry, or discard —
// because a post that vanished is indistinguishable from a product that lost
// it, and on 2G that will happen often enough to matter.

export const OutboxKind = {
  POST: "POST",
  MESSAGE: "MESSAGE",
  APPLICATION: "APPLICATION",
  WORK_PROOF_CONFIRM: "WORK_PROOF_CONFIRM",
} as const;
export type OutboxKind = (typeof OutboxKind)[keyof typeof OutboxKind];

export const OutboxState = {
  QUEUED: "queued",
  SENDING: "sending",
  FAILED: "failed",
} as const;
export type OutboxState = (typeof OutboxState)[keyof typeof OutboxState];

export interface OutboxEntry {
  /** Client-generated, and doubles as the `Idempotency-Key`. */
  id: string;
  kind: OutboxKind;
  /** The request body, opaque to the queue. */
  payload: unknown;
  createdAt: number;
  attempts: number;
  lastError?: string;
  state: OutboxState;
  /**
   * Epoch ms before which this entry must not be retried.
   *
   * Persisted rather than held in a timer: a timer dies with the tab or the
   * app, and the outage this queue exists for routinely outlasts both. Storing
   * the deadline means a cold start resumes the same backoff instead of
   * hammering a server that is still down.
   */
  nextAttemptAt: number;
}

/** Where the queue is kept. Web uses IndexedDB, mobile a JSON file. */
export interface OutboxStorage {
  read(): Promise<OutboxEntry[]>;
  write(entries: OutboxEntry[]): Promise<void>;
}

/**
 * Perform one entry's request.
 *
 * Resolve on success. Throw to retry — including on a network failure, which
 * is the common case and must not be mistaken for a rejection.
 *
 * Returning `false` means the server refused it permanently (a validation
 * error, a closed job): retrying that is pointless, so it fails immediately
 * and shows up in the tray where the member can decide.
 */
export type OutboxSender = (entry: OutboxEntry) => Promise<void | false>;

export interface Outbox {
  enqueue(kind: OutboxKind, payload: unknown, id?: string): Promise<OutboxEntry>;
  /** Send everything due. Safe to call concurrently; overlapping calls collapse. */
  flush(): Promise<void>;
  list(): Promise<OutboxEntry[]>;
  /** Move a failed entry back into the queue, due immediately. */
  retry(id: string): Promise<void>;
  discard(id: string): Promise<void>;
  subscribe(listener: () => void): () => void;
}

/** Retry after 2^n seconds, capped at five minutes, for eight attempts. */
export const MAX_ATTEMPTS = 8;
const MAX_BACKOFF_SECONDS = 300;

export function backoffMs(attempts: number): number {
  return Math.min(2 ** attempts, MAX_BACKOFF_SECONDS) * 1000;
}

export interface OutboxOptions {
  storage: OutboxStorage;
  send: OutboxSender;
  /** Injected so the schedule is testable without waiting five minutes. */
  now?: () => number;
  /** Client-generated id, which is also the idempotency key. */
  newId?: () => string;
}

function defaultId(): string {
  return `ob-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createOutbox(options: OutboxOptions): Outbox {
  const { storage, send } = options;
  const now = options.now ?? (() => Date.now());
  const newId = options.newId ?? defaultId;

  const listeners = new Set<() => void>();
  const notify = (): void => {
    for (const listener of listeners) listener();
  };

  // Every mutation runs through one promise chain. Two callers writing the
  // whole queue at once is how an outbox loses an entry: read-modify-write on
  // a shared array has no atomicity, and the second write wins with stale data.
  let chain: Promise<unknown> = Promise.resolve();
  const serialize = <T>(work: () => Promise<T>): Promise<T> => {
    const next = chain.then(work, work);
    chain = next.catch(() => undefined);
    return next;
  };

  const mutate = async (
    change: (entries: OutboxEntry[]) => OutboxEntry[] | Promise<OutboxEntry[]>,
  ): Promise<OutboxEntry[]> => {
    const entries = await change(await storage.read());
    await storage.write(entries);
    notify();
    return entries;
  };

  return {
    enqueue(kind, payload, id) {
      return serialize(async () => {
        const entry: OutboxEntry = {
          id: id ?? newId(),
          kind,
          payload,
          createdAt: now(),
          attempts: 0,
          state: OutboxState.QUEUED,
          nextAttemptAt: now(),
        };
        await mutate((entries) => [...entries, entry]);
        return entry;
      });
    },

    list() {
      return storage.read();
    },

    retry(id) {
      return serialize(async () => {
        await mutate((entries) =>
          entries.map((entry) =>
            entry.id === id
              ? {
                  ...entry,
                  // Attempts reset: the member asked again, and making them
                  // wait five minutes for a queue they can see is absurd.
                  state: OutboxState.QUEUED,
                  attempts: 0,
                  nextAttemptAt: now(),
                  lastError: undefined,
                }
              : entry,
          ),
        );
      });
    },

    discard(id) {
      return serialize(async () => {
        await mutate((entries) => entries.filter((entry) => entry.id !== id));
      });
    },

    flush() {
      return serialize(async () => {
        const due = (await storage.read()).filter(
          (entry) => entry.state !== OutboxState.FAILED && entry.nextAttemptAt <= now(),
        );

        // Oldest first, one at a time. Order is the point for messages, and a
        // parallel flush on 2G would make every request slower than sending
        // them in turn.
        for (const entry of [...due].sort((a, b) => a.createdAt - b.createdAt)) {
          await attempt(entry.id);
        }
      });
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
  };

  async function attempt(id: string): Promise<void> {
    const current = (await storage.read()).find((entry) => entry.id === id);
    if (!current || current.state === OutboxState.FAILED) return;

    await mutate((entries) =>
      entries.map((entry) => (entry.id === id ? { ...entry, state: OutboxState.SENDING } : entry)),
    );

    let outcome: "sent" | "retry" | "rejected";
    let message: string | undefined;
    try {
      outcome =
        (await send({ ...current, state: OutboxState.SENDING })) === false ? "rejected" : "sent";
    } catch (error: unknown) {
      outcome = "retry";
      message = error instanceof Error ? error.message : String(error);
    }

    if (outcome === "sent") {
      await mutate((entries) => entries.filter((entry) => entry.id !== id));
      return;
    }

    const attempts = current.attempts + 1;
    const exhausted = outcome === "rejected" || attempts >= MAX_ATTEMPTS;

    await mutate((entries) =>
      entries.map((entry) =>
        entry.id === id
          ? {
              ...entry,
              attempts,
              lastError: message ?? entry.lastError,
              state: exhausted ? OutboxState.FAILED : OutboxState.QUEUED,
              nextAttemptAt: exhausted ? entry.nextAttemptAt : now() + backoffMs(attempts),
            }
          : entry,
      ),
    );
  }
}
