"use client";

import {
  Message as MessageSchema,
  upsertMessage,
  type ChatRoom,
  type Message,
} from "@baydar/shared";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

import { apiCall, apiFetch, ApiRequestError, apiFetchPage } from "@/lib/api";

import { useRoomMessageSendActions } from "./useRoomMessageSendActions";
import { useRoomMessagesDerived } from "./useRoomMessagesDerived";
import { useRoomMessagesEvents } from "./useRoomMessagesEvents";
import {
  MessagesPageEnvelope,
  RoomsEnvelope,
  type UseRoomMessagesInput,
  type UseRoomMessagesResult,
} from "./useRoomMessages.types";

export function useRoomMessages({ token, viewerId }: UseRoomMessagesInput): UseRoomMessagesResult {
  const t = useTranslations("messaging");
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [typingUserByRoom, setTypingUserByRoom] = useState<
    Record<string, { userId: string; expiresAt: number }>
  >({});
  const [failedClientIds, setFailedClientIds] = useState<Set<string>>(() => new Set());
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<Message | null>(null);
  const [reportMessage, setReportMessage] = useState<Message | null>(null);
  const [editingBody, setEditingBody] = useState("");
  const threadRef = useRef<HTMLDivElement | null>(null);
  const firstUnreadRef = useRef<HTMLDivElement | null>(null);
  const didInitialScrollRef = useRef(false);
  // Which room the reader is actually looking at, readable *after* an await.
  // Web switches rooms in place (mobile pushes a screen per room and cannot hit
  // this), so a page for the room they just left can still be in flight.
  const activeRoomIdRef = useRef<string | null>(null);
  const lastTypingPostRef = useRef<{ roomId: string | null; at: number }>({
    roomId: null,
    at: 0,
  });

  const loadRooms = useCallback(async (tk: string): Promise<ChatRoom[]> => {
    const out = await apiFetchPage("/messaging/rooms", RoomsEnvelope, { token: tk });
    setRooms(out.data);
    return out.data;
  }, []);

  useEffect(() => {
    if (!token) return undefined;
    let cancelled = false;
    void loadRooms(token).then((list) => {
      if (cancelled) return;
      const requestedRoomId = new URLSearchParams(window.location.search).get("roomId");
      setActiveRoomId((current) => {
        if (current || list.length === 0) return current;
        return requestedRoomId && list.some((room) => room.id === requestedRoomId)
          ? requestedRoomId
          : list[0]!.id;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [loadRooms, token]);

  const loadMessages = useCallback(
    async (roomId: string, after: string | null): Promise<void> => {
      if (!token) return;
      const qs = new URLSearchParams({ limit: "30" });
      if (after) qs.set("after", after);
      const page = await apiFetchPage(
        `/messaging/rooms/${roomId}/messages?${qs.toString()}`,
        MessagesPageEnvelope,
        { token },
      );
      // Dropped, not merged: on a slow link the previous room's page arrives
      // after the new room's and used to overwrite it, leaving the wrong
      // conversation on screen — with its cursor — until something else
      // refreshed the thread.
      if (activeRoomIdRef.current !== roomId) return;
      const asc = [...page.data].reverse();
      setMessages((prev) => (after ? [...asc, ...prev] : asc));
      setNextCursor(page.meta.nextCursor);
      setHasMore(page.meta.hasMore);
    },
    [token],
  );

  useEffect(() => {
    if (!activeRoomId || !token) return;
    activeRoomIdRef.current = activeRoomId;
    setMessages([]);
    setNextCursor(null);
    setHasMore(false);
    didInitialScrollRef.current = false;
    void loadMessages(activeRoomId, null).then(() => {
      void apiCall(`/messaging/rooms/${activeRoomId}/read`, {
        method: "POST",
        token,
      }).catch(() => {});
    });
  }, [activeRoomId, loadMessages, token]);

  const refreshStreamState = useCallback((): void => {
    if (!token) return;
    void loadRooms(token).catch(() => {});
    if (!activeRoomId) return;
    void loadMessages(activeRoomId, null)
      .then(() =>
        apiCall(`/messaging/rooms/${activeRoomId}/read`, {
          method: "POST",
          token,
        }).catch(() => {}),
      )
      .catch(() => {});
  }, [activeRoomId, loadMessages, loadRooms, token]);

  useRoomMessagesEvents({
    token,
    viewerId,
    activeRoomId,
    threadRef,
    setMessages,
    setRooms,
    setTypingUserByRoom,
    onOpen: refreshStreamState,
    setError,
    translate: (message) => t(message),
  });

  const { postTypingThrottled, submit, retryFailed } = useRoomMessageSendActions({
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
    translate: (key) => t(key),
  });

  const saveEdit = useCallback(async (): Promise<void> => {
    if (!actionMessage || !token) return;
    try {
      const saved = await apiFetch(`/messaging/messages/${actionMessage.id}`, MessageSchema, {
        method: "PATCH",
        token,
        body: { body: editingBody.trim() },
      });
      setMessages((prev) => upsertMessage(prev, saved));
      setActionMessage(null);
      setEditingBody("");
    } catch (err) {
      setError(err instanceof ApiRequestError ? t("edit.failed") : t("edit.failed"));
    }
  }, [actionMessage, editingBody, t, token]);

  const deleteMessage = useCallback(
    async (message: Message): Promise<void> => {
      if (!token) return;
      try {
        const deleted = await apiFetch(`/messaging/messages/${message.id}`, MessageSchema, {
          method: "DELETE",
          token,
        });
        setMessages((prev) => upsertMessage(prev, deleted));
        setActionMessage(null);
        setEditingBody("");
      } catch (err) {
        setError(err instanceof ApiRequestError ? t("delete.failed") : t("delete.failed"));
      }
    },
    [t, token],
  );

  const {
    activeRoom,
    otherMember,
    memberById,
    otherOnline,
    filteredRooms,
    grouped,
    firstUnreadIndex,
    otherLastReadAtMs,
  } = useRoomMessagesDerived({
    rooms,
    activeRoomId,
    messages,
    viewerId,
    searchTerm,
  });

  const scrollToUnread = useCallback((): void => {
    if (firstUnreadIndex >= 0) {
      firstUnreadRef.current?.scrollIntoView({ block: "center" });
    } else if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [firstUnreadIndex]);

  useEffect(() => {
    if (didInitialScrollRef.current || messages.length === 0) return;
    didInitialScrollRef.current = true;
    requestAnimationFrame(scrollToUnread);
  }, [messages.length, scrollToUnread]);

  const activeTyping =
    activeRoomId && typingUserByRoom[activeRoomId] ? typingUserByRoom[activeRoomId] : null;

  const loadOlder = useCallback((): void => {
    if (activeRoomId && nextCursor) void loadMessages(activeRoomId, nextCursor);
  }, [activeRoomId, loadMessages, nextCursor]);

  return {
    rooms,
    filteredRooms,
    activeRoomId,
    activeRoom,
    otherMember,
    memberById,
    otherOnline,
    messages,
    grouped,
    hasMore,
    draft,
    sending,
    searchTerm,
    failedClientIds,
    error,
    actionMessage,
    reportMessage,
    editingBody,
    activeTyping,
    firstUnreadIndex,
    unreadCount: firstUnreadIndex >= 0 ? messages.length - firstUnreadIndex : 0,
    otherLastReadAtMs,
    threadRef,
    firstUnreadRef,
    setActiveRoomId,
    setDraft,
    setSearchTerm,
    setError,
    setActionMessage,
    setReportMessage,
    setEditingBody,
    loadOlder,
    scrollToUnread,
    postTypingThrottled,
    submit,
    retryFailed,
    saveEdit,
    deleteMessage,
  };
}
