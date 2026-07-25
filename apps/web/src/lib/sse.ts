import { StreamTokenResponse, type StreamTokenScope } from "@baydar/shared";

import { apiFetch } from "./api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

const STREAM_PATHS: Record<StreamTokenScope, string> = {
  messaging: "/messaging/stream",
  notifications: "/notifications/stream",
};

// Reconnect backoff. Capped, jittered, and reset on a successful open.
const BASE_DELAY_MS = 1_000;
const MAX_DELAY_MS = 30_000;

export interface StreamHandlers {
  onEvent(data: string): void;
  /** Fired on every successful (re)connection. */
  onOpen?(): void;
  /** Fired when the connection drops, before the retry is scheduled. */
  onDrop?(): void;
  /** Fired when a token could not be minted at all — usually a dead session. */
  onFailed?(): void;
}

/**
 * Subscribe to a server-sent event stream, reconnecting on its own.
 *
 * Reconnection has to live here rather than in the callers, because the
 * browser cannot do it: `EventSource` cannot send an Authorization header, so
 * the stream is authenticated by a token in the query string — and that token
 * is single-use and 60-second-lived (`AuthTokensService.consumeStreamToken`
 * stamps `consumedAt`, and the guard rejects a second use). `EventSource`
 * retries by replaying the exact same URL, so the built-in retry always
 * presents a spent token, gets a 401, and by the SSE spec then gives up
 * permanently on a non-2xx.
 *
 * Every caller previously either closed the source in `onerror` or left it to
 * that doomed built-in retry, so any transient drop — a tunnel, a wifi
 * handover, a laptop lid — killed realtime messaging and notification badges
 * until the page was navigated. Minting a fresh token per attempt is the only
 * thing that actually reconnects.
 *
 * Returns an unsubscribe function; call it and no further retries are
 * scheduled.
 */
export function openStream(
  scope: StreamTokenScope,
  accessToken: string,
  handlers: StreamHandlers,
): () => void {
  let closed = false;
  let source: EventSource | null = null;
  let retries = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const connect = async (): Promise<void> => {
    if (closed) return;
    let streamToken: string;
    try {
      streamToken = (
        await apiFetch("/auth/stream-token", StreamTokenResponse, {
          method: "POST",
          token: accessToken,
          body: { scope },
        })
      ).token;
    } catch {
      // The access token itself is probably gone. Report once and let the
      // caller's session bootstrap decide — retrying a dead session forever
      // just burns requests.
      if (!closed) handlers.onFailed?.();
      return;
    }
    if (closed) return;

    const url = `${API_BASE}${STREAM_PATHS[scope]}?token=${encodeURIComponent(streamToken)}`;
    const next = new EventSource(url);
    source = next;

    next.onopen = (): void => {
      retries = 0;
      handlers.onOpen?.();
    };
    next.onmessage = (event: MessageEvent<string>): void => {
      handlers.onEvent(event.data);
    };
    next.onerror = (): void => {
      if (closed) return;
      // Close before scheduling: leaving it open lets the browser start its
      // own doomed retry loop against the spent token in parallel with ours.
      next.close();
      if (source === next) source = null;
      handlers.onDrop?.();
      scheduleRetry();
    };
  };

  const scheduleRetry = (): void => {
    if (closed || timer) return;
    const capped = Math.min(BASE_DELAY_MS * 2 ** retries, MAX_DELAY_MS);
    // Jitter so every open tab does not reconnect on the same tick after a
    // shared outage.
    const delay = capped / 2 + Math.random() * (capped / 2);
    retries += 1;
    timer = setTimeout(() => {
      timer = null;
      void connect();
    }, delay);
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
