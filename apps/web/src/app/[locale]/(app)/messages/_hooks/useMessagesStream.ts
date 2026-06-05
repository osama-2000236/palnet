"use client";

import { WsChatEvent, type WsChatEvent as WsChatEventType } from "@baydar/shared";
import { useEffect } from "react";

import { openStream } from "@/lib/sse";

export interface UseMessagesStreamInput {
  token: string | null;
  onEvent(event: WsChatEventType): void;
  onError(message: "connectionLost" | "connectionFailed"): void;
}

export function useMessagesStream({ token, onEvent, onError }: UseMessagesStreamInput): void {
  useEffect(() => {
    let cancelled = false;
    let es: EventSource | null = null;

    if (!token) return undefined;

    void openStream("messaging", token)
      .then((source) => {
        if (cancelled) {
          source.close();
          return;
        }
        es = source;
        source.onmessage = (evt): void => {
          try {
            const parsed = WsChatEvent.safeParse(JSON.parse(evt.data));
            if (!parsed.success) return;
            onEvent(parsed.data);
          } catch {
            // ignore malformed events
          }
        };
        source.onerror = () => {
          if (cancelled) return;
          onError("connectionLost");
          es?.close();
        };
      })
      .catch(() => {
        if (!cancelled) onError("connectionFailed");
      });

    return (): void => {
      cancelled = true;
      es?.close();
    };
  }, [token, onEvent, onError]);
}
