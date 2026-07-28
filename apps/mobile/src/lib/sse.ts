import {
  openStreamLoop,
  StreamTokenResponse,
  STREAM_PATHS,
  type StreamTokenScope,
} from "@baydar/shared";
import EventSource, { type EventSourceListener } from "react-native-sse";
import type { z } from "zod";

import { API_BASE, apiFetch, getValidAccessToken } from "./api";

const CUSTOM_EVENT_TYPES = [
  "message.new",
  "message.edited",
  "message.deleted",
  "message.read",
  "typing",
  "notification.new",
  "notification.read",
  "notification.unread-count",
] as const;
type CustomEventType = (typeof CUSTOM_EVENT_TYPES)[number];
type DataEvent = { data?: string | null };

interface SubscribeArgs<T extends z.ZodTypeAny> {
  scope: StreamTokenScope;
  schema: T;
  onEvent: (event: z.infer<T>) => void;
  /** A malformed payload on an otherwise healthy stream. */
  onError?: (error: Error) => void;
  /**
   * Fired on every successful (re)connection. Callers that keep a counter
   * should refetch here: events that fired while the stream was down are gone.
   */
  onOpen?: () => void;
  /** The connection dropped; a reconnect is already scheduled. */
  onDrop?: () => void;
  /** No stream token could be minted — the session is probably gone. */
  onFailed?: () => void;
}

/**
 * Subscribe to a server-sent event stream, reconnecting on its own.
 *
 * The retry loop and the per-attempt token mint live in `@baydar/shared`
 * (`sse-retry.ts`), shared with web. This file is the React Native half.
 *
 * Two things here are not stylistic:
 *
 * `pollingInterval: 0` disables react-native-sse's own reconnect. That is
 * deliberate and the shared loop depends on it — the library reconnects by
 * replaying the identical URL, and the stream token in that URL is single-use,
 * so its retry would present a spent token and 401 forever. It is also why this
 * file previously had no reconnection at all: with the interval at 0 the
 * library schedules nothing, and nothing else was scheduling either.
 *
 * The token goes in the query string, not an Authorization header. Mobile used
 * to send a 15-minute access token as a Bearer header, which works —
 * `JwtAuthGuard` accepts either — but it means the guard's Bearer branch runs
 * and the single-use stream token never gets consumed. Query string keeps both
 * clients on one server code path.
 */
export function subscribeSse<T extends z.ZodTypeAny>({
  scope,
  schema,
  onEvent,
  onError,
  onOpen,
  onDrop,
  onFailed,
}: SubscribeArgs<T>): () => void {
  return openStreamLoop({
    mintToken: async () => {
      const accessToken = await getValidAccessToken();
      if (!accessToken) return null;
      const minted = await apiFetch("/auth/stream-token", StreamTokenResponse, {
        method: "POST",
        token: accessToken,
        body: { scope },
      });
      return minted.token;
    },
    openSource: (token, sourceHandlers) => {
      const url = `${API_BASE}${STREAM_PATHS[scope]}?token=${encodeURIComponent(token)}`;
      const source = new EventSource<CustomEventType>(url, { pollingInterval: 0 });

      const onOpen: EventSourceListener<CustomEventType> = () => sourceHandlers.onOpen();
      const onMessage = (event: DataEvent): void => {
        if (event.data) sourceHandlers.onMessage(event.data);
      };
      const onFailure: EventSourceListener<CustomEventType> = () => sourceHandlers.onError();

      source.addEventListener("open", onOpen);
      source.addEventListener("message", onMessage as EventSourceListener<CustomEventType>);
      source.addEventListener("error", onFailure);
      for (const type of CUSTOM_EVENT_TYPES) {
        source.addEventListener(type, onMessage as EventSourceListener<CustomEventType>);
      }

      return {
        close: () => {
          source.removeEventListener("open", onOpen);
          source.removeEventListener("message", onMessage as EventSourceListener<CustomEventType>);
          source.removeEventListener("error", onFailure);
          for (const type of CUSTOM_EVENT_TYPES) {
            source.removeEventListener(type, onMessage as EventSourceListener<CustomEventType>);
          }
          source.close();
        },
      };
    },
    handlers: {
      // Decoding is the one thing that can throw on the platform's dispatch
      // path, so it catches here rather than letting a malformed frame escape
      // into react-native-sse's listener loop. A bad frame is not a dropped
      // connection: report it and keep the stream open.
      onEvent: (data) => {
        let payload: unknown;
        try {
          payload = JSON.parse(data);
        } catch {
          onError?.(new Error(`Malformed SSE frame on ${scope}`));
          return;
        }
        const parsed = schema.safeParse(payload);
        if (!parsed.success) {
          onError?.(new Error(`Invalid SSE payload on ${scope}`));
          return;
        }
        onEvent(parsed.data as z.infer<T>);
      },
      onOpen,
      onDrop,
      onFailed,
    },
  });
}
