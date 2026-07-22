"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { apiCall } from "@/lib/api";
import { TYPING_POST_THROTTLE_MS } from "./utils";

export interface TypingState {
  userId: string;
  expiresAt: number;
}

/**
 * Peer typing state plus the throttled outbound ping. Split out of
 * useMessageThread to keep that hook under the 300-LOC design cap — the
 * concern is self-contained: one piece of state, its expiry timer, and one
 * fire-and-forget POST.
 */
export function useTypingIndicator(roomId: string | undefined, token: string | null) {
  const [typing, setTyping] = useState<TypingState | null>(null);
  const lastPostRef = useRef(0);

  // Expire the indicator on its own timer so a peer that stops typing without
  // sending doesn't leave the bubble up forever.
  useEffect(() => {
    if (!typing) return undefined;
    const remaining = typing.expiresAt - Date.now();
    if (remaining <= 0) {
      setTyping(null);
      return undefined;
    }
    const id = setTimeout(() => setTyping(null), remaining);
    return () => clearTimeout(id);
  }, [typing]);

  const postTypingThrottled = useCallback((): void => {
    if (!token || !roomId) return;
    const now = Date.now();
    if (now - lastPostRef.current < TYPING_POST_THROTTLE_MS) return;
    lastPostRef.current = now;
    void apiCall(`/messaging/rooms/${roomId}/typing`, { method: "POST", token }).catch(() => {});
  }, [token, roomId]);

  return {
    setTyping,
    postTypingThrottled,
    typingActive: typing && typing.expiresAt > Date.now() ? typing : null,
  };
}
