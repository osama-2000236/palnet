import type { StreamTokenScope } from "./schemas/auth";

/**
 * Transport-independent reconnect loop for the SSE streams.
 *
 * Reconnection cannot be left to the platform on either client, and for the
 * same reason on both: the stream is authenticated by a token in the query
 * string, that token is single-use and 60-second-lived
 * (`AuthTokensService.consumeStreamToken` stamps `consumedAt`, and the guard
 * rejects a second use), and every built-in retry works by replaying the exact
 * same URL. So the platform's own retry always presents a spent token and dies.
 *
 * - Browser `EventSource` retries the identical URL, gets a 401, and by the SSE
 *   spec then gives up permanently on a non-2xx.
 * - `react-native-sse` reconnects on a fixed `pollingInterval`, which would
 *   replay the spent token just the same. Mobile therefore passes
 *   `pollingInterval: 0`, which disables its retry entirely — leaving this loop
 *   as the only thing that reconnects at all.
 *
 * Minting a fresh token per attempt is the only thing that actually reconnects,
 * so the mint lives inside the retry, not outside it.
 *
 * The access token behind the mint is resolved per attempt, never captured.
 * Capturing it is the trap: access tokens live 15 minutes, a layout resolves
 * one once on mount and never again, and the outages worth reconnecting from
 * (a closed laptop, a long tunnel, a backgrounded app) outlast that. A captured
 * token means the first reconnect after 15 minutes fails on the mint and stops
 * the loop for good — the same dead stream this function exists to prevent.
 */

/**
 * This package compiles against `lib: ["ES2022"]` and nothing else — no DOM,
 * no `@types/node` — which is what keeps it safe to import from a browser
 * bundle, a React Native bundle and a Nest server alike. Timers are the one
 * host API this module needs and all three runtimes have them, so they are
 * declared here rather than by widening `lib` for every consumer: DOM types in
 * `packages/shared` would make `document.querySelector` typecheck in code that
 * ships to a phone.
 */
declare function setTimeout(handler: () => void, timeoutMs: number): TimerHandle;
declare function clearTimeout(handle: TimerHandle): void;
declare function setInterval(handler: () => void, intervalMs: number): TimerHandle;
declare function clearInterval(handle: TimerHandle): void;
/** A number in browsers, a `Timeout` object in Node. Never inspected here. */
type TimerHandle = unknown;

/** Reconnect backoff. Capped, jittered, and reset on a successful open. */
const BASE_DELAY_MS = 1_000;
const MAX_DELAY_MS = 30_000;

export const STREAM_PATHS: Record<StreamTokenScope, string> = {
  messaging: "/messaging/stream",
  notifications: "/notifications/stream",
};

export interface StreamHandlers {
  onEvent(data: string): void;
  /** Fired on every successful (re)connection. */
  onOpen?(): void;
  /** Fired when the connection drops, before the retry is scheduled. */
  onDrop?(): void;
  /**
   * Fired when the session itself is gone and the loop has stopped. Not fired
   * for an unreachable server — that is a drop, and it keeps retrying.
   */
  onFailed?(): void;
}

/** What the loop needs back from a platform source in order to drive it. */
export interface StreamSourceHandlers {
  onOpen(): void;
  onMessage(data: string): void;
  onError(): void;
}

/** The only thing the loop needs to be able to do to a platform source. */
export interface StreamSource {
  close(): void;
}

export interface StreamLoopOptions {
  /**
   * Mint a fresh single-use stream token for this attempt.
   *
   * The two failure modes are not the same and the loop treats them
   * differently, so adapters must keep them apart:
   *
   * - **Resolve `null`** when there is no session left to mint with. The loop
   *   reports `onFailed` once and stops, rather than burning requests forever
   *   against an account that is logged out.
   * - **Throw** for anything else — the API is down, mid-deploy, behind a
   *   captive portal, refusing connections. The loop treats it as a drop and
   *   keeps backing off. This is the case reconnection exists for, so it must
   *   not be mistaken for the one above.
   */
  mintToken(): Promise<string | null>;
  /** Open a platform event source for a freshly minted token. */
  openSource(token: string, handlers: StreamSourceHandlers): StreamSource;
  handlers: StreamHandlers;
  /**
   * Poll on this interval instead of opening a stream, or `null` to stream.
   *
   * A held-open connection is not free on 2G: it keeps the radio warm, it
   * re-mints a single-use token on every drop, and drops are what 2G does. So
   * on `light` the client polls every two minutes and opens no EventSource at
   * all — `BANDWIDTH_POLICY.light.pollIntervalMs` is where the number lives.
   *
   * Each tick is reported through `onOpen`, because that is already exactly
   * what a caller's `onOpen` does: re-read the truth, since events that fired
   * while nothing was listening are gone either way. No caller needs a second
   * code path for polling, which is the point.
   */
  pollIntervalMs?: number | null;
}

/**
 * Subscribe to a server-sent event stream, reconnecting on its own.
 *
 * Returns an unsubscribe function; call it and no further retries are
 * scheduled.
 */
export function openStreamLoop(options: StreamLoopOptions): () => void {
  const { mintToken, openSource, handlers, pollIntervalMs } = options;

  // Poll mode: no token is minted and no source is opened, so none of the
  // reconnect machinery below runs. Deliberately the first thing this function
  // does — a stream that is merely closed quickly has already cost the radio.
  if (pollIntervalMs !== null && pollIntervalMs !== undefined) {
    let stopped = false;
    const tick = (): void => {
      if (!stopped) handlers.onOpen?.();
    };
    tick();
    const interval = setInterval(tick, pollIntervalMs);
    return (): void => {
      stopped = true;
      clearInterval(interval);
    };
  }

  let closed = false;
  let source: StreamSource | null = null;
  let retries = 0;
  let timer: TimerHandle | null = null;

  const scheduleRetry = (): void => {
    if (closed || timer) return;
    const capped = Math.min(BASE_DELAY_MS * 2 ** retries, MAX_DELAY_MS);
    // Jitter so every open client does not reconnect on the same tick after a
    // shared outage.
    const delay = capped / 2 + Math.random() * (capped / 2);
    retries += 1;
    timer = setTimeout(() => {
      timer = null;
      void connect();
    }, delay);
  };

  const connect = async (): Promise<void> => {
    if (closed) return;

    let streamToken: string | null;
    try {
      streamToken = await mintToken();
    } catch {
      // The mint endpoint was unreachable, not the session invalid. Collapsing
      // these two was a live bug: killing the API dropped the stream, the retry
      // 640ms later could not reach the just-killed server, and the loop
      // reported `onFailed` and stopped for good — so the client stayed dead
      // through exactly the restart it was supposed to ride out. Back off and
      // try again instead.
      if (closed) return;
      handlers.onDrop?.();
      scheduleRetry();
      return;
    }
    if (!streamToken) {
      // No session left to mint with. Report once and let the caller's session
      // bootstrap decide — retrying a logged-out account just burns requests.
      if (!closed) handlers.onFailed?.();
      return;
    }
    if (closed) return;

    // A box rather than a `const next = openSource(...)` the handlers close
    // over: an adapter that fires `onError` synchronously during construction
    // would hit that binding in its temporal dead zone and throw a
    // ReferenceError out of the platform's own error path, where nothing is
    // watching. Neither adapter does that today; this costs one object.
    const attempt: { source: StreamSource | null; live: boolean } = { source: null, live: true };

    attempt.source = openSource(streamToken, {
      onOpen: () => {
        retries = 0;
        handlers.onOpen?.();
      },
      onMessage: (data) => {
        handlers.onEvent(data);
      },
      onError: () => {
        if (closed || !attempt.live) return;
        // One retry per dropped connection. Platform sources fire `error` more
        // than once for a single drop (react-native-sse dispatches from both
        // `onreadystatechange` and `onerror`), and each one would otherwise
        // start its own backoff ladder.
        attempt.live = false;
        // Close before scheduling: leaving it open lets the platform start its
        // own doomed retry loop against the spent token in parallel with ours.
        attempt.source?.close();
        if (source === attempt.source) source = null;
        handlers.onDrop?.();
        scheduleRetry();
      },
    });
    source = attempt.source;
  };

  void connect();

  return (): void => {
    closed = true;
    if (timer) clearTimeout(timer);
    timer = null;
    source?.close();
    source = null;
  };
}
