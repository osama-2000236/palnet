import {
  ApiRequestError,
  createOutbox,
  isPermanentRejection,
  outboxRequest,
  type Outbox,
} from "@baydar/shared";
import NetInfo from "@react-native-community/netinfo";
import { AppState } from "react-native";

import { apiCall } from "./api";
import { createNativeOutboxStorage } from "./outbox-storage";

/**
 * The app's outbox, and the two things that make it drain.
 *
 * Same sender as web's, for the same reason: the routes, the idempotency key
 * and the give-up rule all live in `@baydar/shared`, so this only turns one
 * request description into an `apiCall` and classifies what came back.
 */
export const outbox: Outbox = createOutbox({
  storage: createNativeOutboxStorage(),
  send: async (entry) => {
    const request = outboxRequest(entry);
    try {
      await apiCall(request.path, {
        method: request.method,
        body: request.body,
        headers: request.headers,
      });
    } catch (error: unknown) {
      // `status === 0` is the client's own network error — always retryable.
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
 * Reachability from NetInfo, and returning to the foreground — the moment a
 * member expects the post they wrote in a lift to have gone out. The interval
 * covers the 2G case where the phone reports a connection throughout an outage
 * that drops every request.
 */
const POLL_MS = 60_000;

export function startOutboxDrain(): () => void {
  const drain = (): void => void outbox.flush().catch(() => undefined);

  drain();
  const interval = setInterval(drain, POLL_MS);
  const unsubscribeNet = NetInfo.addEventListener((state) => {
    if (state.isConnected !== false) drain();
  });
  const appState = AppState.addEventListener("change", (next) => {
    if (next === "active") drain();
  });

  return () => {
    clearInterval(interval);
    unsubscribeNet();
    appState.remove();
  };
}
