"use client";

import { WsChatEvent, type WsChatEvent as WsChatEventType } from "@baydar/shared";
import { useBandwidth } from "@baydar/shared/react";
import { useEffect } from "react";

import { openStream } from "@/lib/sse";

export interface UseMessagesStreamInput {
  token: string | null;
  onEvent(event: WsChatEventType): void;
  onOpen(): void;
  onError(message: "connectionLost" | "connectionFailed"): void;
}

export function useMessagesStream({
  token,
  onEvent,
  onOpen,
  onError,
}: UseMessagesStreamInput): void {
  const { mode } = useBandwidth();

  useEffect(() => {
    if (!token) return undefined;

    // `openStream` owns the retry loop. This hook used to close the source in
    // `onerror` and never reopen, so one dropped connection ended realtime
    // messaging for the life of the mount.
    return openStream("messaging", {
      onEvent: (data) => {
        try {
          const parsed = WsChatEvent.safeParse(JSON.parse(data));
          if (!parsed.success) return;
          onEvent(parsed.data);
        } catch {
          // ignore malformed events
        }
      },
      onOpen,
      onDrop: () => onError("connectionLost"),
      onFailed: () => onError("connectionFailed"),
    });
  }, [token, onEvent, onOpen, onError, mode]);
}
