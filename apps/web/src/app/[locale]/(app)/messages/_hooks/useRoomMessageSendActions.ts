"use client";

import { Message as MessageSchema, TYPING_POST_THROTTLE_MS, type Message } from "@baydar/shared";
import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from "react";

import { apiCall, apiFetch, ApiRequestError } from "@/lib/api";

interface UseRoomMessageSendActionsInput {
  token: string | null;
  viewerId: string | null;
  activeRoomId: string | null;
  draft: string;
  messages: Message[];
  threadRef: MutableRefObject<HTMLDivElement | null>;
  lastTypingPostRef: MutableRefObject<{ roomId: string | null; at: number }>;
  setDraft(value: string): void;
  setSending(value: boolean): void;
  setMessages: Dispatch<SetStateAction<Message[]>>;
  setFailedClientIds: Dispatch<SetStateAction<Set<string>>>;
  setError(value: string | null): void;
  translate(key: "sendFailed"): string;
}

export function useRoomMessageSendActions({
  token,
  viewerId,
  activeRoomId,
  draft,
  messages,
  threadRef,
  lastTypingPostRef,
  setDraft,
  setSending,
  setMessages,
  setFailedClientIds,
  setError,
  translate,
}: UseRoomMessageSendActionsInput) {
  const postTypingThrottled = useCallback((): void => {
    if (!activeRoomId || !token) return;
    const now = Date.now();
    if (
      lastTypingPostRef.current.roomId === activeRoomId &&
      now - lastTypingPostRef.current.at < TYPING_POST_THROTTLE_MS
    ) {
      return;
    }
    lastTypingPostRef.current = { roomId: activeRoomId, at: now };
    void apiCall(`/messaging/rooms/${activeRoomId}/typing`, { method: "POST", token }).catch(
      () => {},
    );
  }, [activeRoomId, lastTypingPostRef, token]);

  const submit = useCallback(async (): Promise<void> => {
    if (!activeRoomId || !token || draft.trim().length === 0) return;
    setSending(true);
    setError(null);
    const clientMessageId = `web-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const optimistic = createOptimisticMessage(activeRoomId, viewerId, draft, clientMessageId);
    setMessages((prev) => [...prev, optimistic]);
    setDraft("");
    requestAnimationFrame(() => {
      if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
    });
    try {
      const saved = await sendMessage(activeRoomId, optimistic.body, clientMessageId, token);
      setMessages((prev) => replaceByClientId(prev, clientMessageId, saved));
    } catch (err) {
      setFailedClientIds((prev) => new Set(prev).add(clientMessageId));
      setError(err instanceof ApiRequestError ? translate("sendFailed") : translate("sendFailed"));
    } finally {
      setSending(false);
    }
  }, [
    activeRoomId,
    draft,
    setDraft,
    setError,
    setFailedClientIds,
    setMessages,
    setSending,
    threadRef,
    token,
    translate,
    viewerId,
  ]);

  const retryFailed = useCallback(
    async (clientMessageId: string): Promise<void> => {
      const target = messages.find((message) => message.clientMessageId === clientMessageId);
      if (!target || !activeRoomId || !token) return;
      setFailedClientIds((prev) => {
        const next = new Set(prev);
        next.delete(clientMessageId);
        return next;
      });
      try {
        const saved = await sendMessage(activeRoomId, target.body, clientMessageId, token);
        setMessages((prev) => replaceByClientId(prev, clientMessageId, saved));
      } catch {
        setFailedClientIds((prev) => new Set(prev).add(clientMessageId));
      }
    },
    [activeRoomId, messages, setFailedClientIds, setMessages, token],
  );

  return { postTypingThrottled, submit, retryFailed };
}

function createOptimisticMessage(
  roomId: string,
  viewerId: string | null,
  draft: string,
  clientMessageId: string,
): Message {
  return {
    id: `pending-${clientMessageId}`,
    roomId,
    authorId: viewerId ?? "me",
    body: draft.trim(),
    mediaUrl: null,
    clientMessageId,
    createdAt: new Date().toISOString(),
    editedAt: null,
    deletedAt: null,
  };
}

async function sendMessage(
  roomId: string,
  body: string,
  clientMessageId: string,
  token: string,
): Promise<Message> {
  return apiFetch(`/messaging/rooms/${roomId}/messages`, MessageSchema, {
    method: "POST",
    token,
    body: { body, clientMessageId },
  });
}

function replaceByClientId(
  current: Message[],
  clientMessageId: string,
  message: Message,
): Message[] {
  const idx = current.findIndex((item) => item.clientMessageId === clientMessageId);
  if (idx < 0) return current;
  const next = current.slice();
  next[idx] = message;
  return next;
}
