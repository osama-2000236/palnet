import {
  openStreamLoop,
  StreamTokenResponse,
  STREAM_PATHS,
  type StreamHandlers,
  type StreamTokenScope,
} from "@baydar/shared";

import { apiFetch, getValidAccessToken } from "./api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export type { StreamHandlers };

/**
 * Subscribe to a server-sent event stream, reconnecting on its own.
 *
 * The retry loop, the per-attempt token mint, and the reasoning behind both now
 * live in `@baydar/shared` (`sse-retry.ts`) so the two clients cannot drift
 * apart on them again — mobile shipped with no reconnect at all for exactly as
 * long as this file was the only copy.
 *
 * Everything below is the browser-specific half: `EventSource` cannot send an
 * Authorization header, which is why the stream is authenticated by a token in
 * the query string in the first place.
 *
 * Returns an unsubscribe function; call it and no further retries are
 * scheduled.
 */
export function openStream(scope: StreamTokenScope, handlers: StreamHandlers): () => void {
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
      const source = new EventSource(url);
      source.onopen = (): void => sourceHandlers.onOpen();
      source.onmessage = (event: MessageEvent<string>): void =>
        sourceHandlers.onMessage(event.data);
      source.onerror = (): void => sourceHandlers.onError();
      return source;
    },
    handlers,
  });
}
