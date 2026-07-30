"use client";

import {
  ChatRoom as ChatRoomSchema,
  Message as MessageSchema,
  upsertMessage,
  WsChatEvent,
  type ChatRoom,
  type Message,
} from "@baydar/shared";
import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { FlatList } from "react-native";

import { apiCall, apiFetch, apiFetchPage } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-errors";
import { track } from "@/lib/analytics";
import { successHaptic, tapHaptic } from "@/lib/haptics";
import { readSession } from "@/lib/session";
import { subscribeSse } from "@/lib/sse";
import { useNetworkStore } from "@/store/network";
import { applyThreadEvent, createOptimisticMessage } from "./messageThreadEvents";
import { useThreadDerived } from "./useThreadDerived";
import { useTypingIndicator } from "./useTypingIndicator";
import { MessagesPageEnvelope } from "./utils";

export function useMessageThread(roomId: string | undefined) {
  const { t } = useTranslation();
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [room, setRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [failedClientIds, setFailedClientIds] = useState<Set<string>>(() => new Set());
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<Message | null>(null);
  const [reportMessage, setReportMessage] = useState<Message | null>(null);
  const [editingBody, setEditingBody] = useState("");
  const listRef = useRef<FlatList<Message> | null>(null);
  const didInitialScrollRef = useRef(false);
  const isConnected = useNetworkStore((state) => state.isConnected);
  const { setTyping, postTypingThrottled, typingActive } = useTypingIndicator(roomId, token);

  useEffect(() => {
    void (async () => {
      const session = await readSession();
      if (!session) {
        router.replace("/(auth)/login");
        return;
      }
      setViewerId(session.user.id);
      setToken(session.tokens.accessToken);
    })();
  }, []);

  const refresh = useCallback(async (): Promise<void> => {
    if (!token || !roomId) return;
    try {
      const [nextRoom, page] = await Promise.all([
        apiFetch(`/messaging/rooms/${roomId}`, ChatRoomSchema, { token }),
        apiFetchPage(`/messaging/rooms/${roomId}/messages?limit=30`, MessagesPageEnvelope, {
          token,
        }),
      ]);
      setRoom(nextRoom);
      setMessages([...page.data].reverse());
      setNextCursor(page.meta.nextCursor);
      setHasMore(page.meta.hasMore);
      didInitialScrollRef.current = false;
    } catch (caught) {
      setError(apiErrorMessage(t, caught));
    }
  }, [token, roomId, t]);

  useEffect(() => {
    if (!token || !roomId || !isConnected) return;
    void refresh().then(() => {
      void apiCall(`/messaging/rooms/${roomId}/read`, { method: "POST", token }).catch(() => {});
    });
    let opened = false;
    return subscribeSse({
      scope: "messaging",
      schema: WsChatEvent,
      onEvent: (event) =>
        applyThreadEvent({
          event,
          roomId,
          token,
          viewerId,
          setMessages,
          setRoom,
          setTyping,
        }),
      // Messages sent while the stream was down never arrive as events — the
      // thread is only complete after a fresh read. Skipped on the first open,
      // where the `refresh()` above has just run.
      onOpen: () => {
        if (opened) void refresh();
        opened = true;
      },
    });
  }, [token, roomId, refresh, isConnected, viewerId, setTyping]);

  const refreshThread = useCallback(async (): Promise<void> => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

  const loadOlder = useCallback(async (): Promise<void> => {
    if (!token || !roomId || !nextCursor || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const qs = new URLSearchParams({ limit: "30", after: nextCursor });
      const page = await apiFetchPage(
        `/messaging/rooms/${roomId}/messages?${qs.toString()}`,
        MessagesPageEnvelope,
        { token },
      );
      const olderAsc = [...page.data].reverse();
      setMessages((prev) => [...olderAsc, ...prev]);
      setNextCursor(page.meta.nextCursor);
      setHasMore(page.meta.hasMore);
    } catch (caught) {
      setError(apiErrorMessage(t, caught));
    } finally {
      setLoadingOlder(false);
    }
  }, [token, roomId, nextCursor, loadingOlder, t]);

  const sendBody = useCallback(
    async (text: string, clientMessageId: string): Promise<void> => {
      if (!token || !roomId) return;
      try {
        tapHaptic();
        const saved = await apiFetch(`/messaging/rooms/${roomId}/messages`, MessageSchema, {
          method: "POST",
          token,
          body: { body: text, clientMessageId },
        });
        setMessages((prev) => prev.map((x) => (x.clientMessageId === clientMessageId ? saved : x)));
        track("messages.send", { roomId });
        setFailedClientIds((prev) => {
          if (!prev.has(clientMessageId)) return prev;
          const next = new Set(prev);
          next.delete(clientMessageId);
          return next;
        });
        successHaptic();
      } catch (caught) {
        setFailedClientIds((prev) => new Set(prev).add(clientMessageId));
        setError(apiErrorMessage(t, caught));
      }
    },
    [token, roomId, t],
  );

  async function submit(): Promise<void> {
    if (!token || !roomId || draft.trim().length === 0) return;
    setSending(true);
    setError(null);
    const clientMessageId = `mob-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const text = draft.trim();
    setMessages((prev) => [
      ...prev,
      createOptimisticMessage({ roomId, viewerId, body: text, clientMessageId }),
    ]);
    setDraft("");
    try {
      await sendBody(text, clientMessageId);
    } finally {
      setSending(false);
    }
  }

  function onDraftChange(value: string): void {
    setDraft(value);
    if (value.trim().length > 0) postTypingThrottled();
  }

  const retryFailed = useCallback(
    (clientMessageId: string): void => {
      const target = messages.find((message) => message.clientMessageId === clientMessageId);
      if (!target) return;
      setFailedClientIds((prev) => {
        const next = new Set(prev);
        next.delete(clientMessageId);
        return next;
      });
      void sendBody(target.body, clientMessageId);
    },
    [messages, sendBody],
  );

  const saveEdit = useCallback(async (): Promise<void> => {
    if (!token || !actionMessage) return;
    try {
      const saved = await apiFetch(`/messaging/messages/${actionMessage.id}`, MessageSchema, {
        method: "PATCH",
        token,
        body: { body: editingBody.trim() },
      });
      setMessages((prev) => upsertMessage(prev, saved));
      closeActions();
      successHaptic();
    } catch (caught) {
      setError(apiErrorMessage(t, caught));
    }
  }, [actionMessage, editingBody, token, t]);

  const deleteSelected = useCallback(async (): Promise<void> => {
    if (!token || !actionMessage) return;
    try {
      const deleted = await apiFetch(`/messaging/messages/${actionMessage.id}`, MessageSchema, {
        method: "DELETE",
        token,
      });
      setMessages((prev) => upsertMessage(prev, deleted));
      closeActions();
      successHaptic();
    } catch (caught) {
      setError(apiErrorMessage(t, caught));
    }
  }, [actionMessage, token, t]);

  const derived = useThreadDerived({ room, viewerId, messages });

  const scrollToUnread = useCallback(
    (animated: boolean): void => {
      if (messages.length === 0) return;
      if (derived.firstUnreadIndex >= 0) {
        listRef.current?.scrollToIndex({
          index: derived.firstUnreadIndex,
          viewPosition: 0.5,
          animated,
        });
      } else {
        listRef.current?.scrollToEnd({ animated });
      }
    },
    [derived.firstUnreadIndex, messages.length],
  );

  useEffect(() => {
    if (didInitialScrollRef.current || messages.length === 0) return;
    didInitialScrollRef.current = true;
    requestAnimationFrame(() => scrollToUnread(false));
  }, [messages.length, scrollToUnread]);

  function openMessageActions(message: Message): void {
    setActionMessage(message);
    setEditingBody(message.body);
  }

  function closeActions(): void {
    setActionMessage(null);
    setEditingBody("");
  }

  return {
    ...derived,
    listRef,
    viewerId,
    room,
    messages,
    hasMore,
    loadingOlder,
    failedClientIds,
    draft,
    sending,
    refreshing,
    error,
    actionMessage,
    reportMessage,
    editingBody,
    typingActive,
    setDraft: onDraftChange,
    setError,
    setReportMessage,
    setEditingBody,
    refreshThread,
    loadOlder,
    submit,
    retryFailed,
    saveEdit,
    deleteSelected,
    scrollToUnread,
    openMessageActions,
    closeActions,
  };
}
