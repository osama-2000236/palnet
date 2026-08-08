"use client";

import {
  ApiRequestError,
  createOutbox,
  isPermanentRejection,
  outboxRequest,
  type Outbox,
} from "@baydar/shared";

import { apiCall } from "./api";
import { createWebOutboxStorage } from "./outbox-storage";

/**
 * The browser's outbox, and the two things that make it drain.
 *
 * The sender is thin by design: the routes, the idempotency key and the
 * give-up rule are all in `@baydar/shared`, so this only has to turn one
 * request description into an `apiCall` and classify what came back.
 */
export const outbox: Outbox = createOutbox({
  storage: createWebOutboxStorage(),
  send: async (entry) => {
    const request = outboxRequest(entry);
    try {
      await apiCall(request.path, {
        method: request.method,
        body: request.body,
        headers: request.headers,
      });
    } catch (error: unknown) {
      // A refusal the server will repeat fails the entry now; anything else —
      // a 5xx, a timeout, a dead socket — is a retry. `status === 0` is the
      // client's own network error and is always worth another attempt.
      if (
        error instanceof ApiRequestError &&
        error.status > 0 &&
        isPermanentRejection(error.status)
      ) {
        return false;
      }
      throw error;
    }
  },
});

/**
 * Drain the queue when there is any reason to think it might succeed.
 *
 * `online` is the obvious one. The interval is the one that matters on 2G,
 * where the browser reports `online` throughout an outage that drops every
 * request — `navigator.onLine` answers "is there a network interface", not
 * "can anything reach the server".
 *
 * Sixty seconds because the queue's own backoff already spaces the attempts;
 * this only decides how soon a due entry is noticed.
 */
const POLL_MS = 60_000;

export function startOutboxDrain(): () => void {
  const drain = (): void => void outbox.flush().catch(() => undefined);

  drain();
  const interval = setInterval(drain, POLL_MS);
  window.addEventListener("online", drain);
  // Coming back to a backgrounded tab is the other moment a member expects
  // their queued post to have gone out.
  document.addEventListener("visibilitychange", drain);

  return () => {
    clearInterval(interval);
    window.removeEventListener("online", drain);
    document.removeEventListener("visibilitychange", drain);
  };
}
