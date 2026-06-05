"use client";

import {
  ChatRoom as ChatRoomSchema,
  CursorPageMeta,
  Message as MessageSchema,
  type ChatRoom,
  type Message,
  type WsChatEvent,
} from "@baydar/shared";
import { groupMessages, type GroupedMessage } from "@baydar/ui-web";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { z } from "zod";

import { apiCall, apiFetch, ApiRequestError, apiFetchPage } from "@/lib/api";

import { ONLINE_WINDOW_MS, TYPING_POST_THROTTLE_MS, TYPING_TTL_MS, upsertMessage } from "../_utils";
import { useMessagesStream } from "./useMessagesStream";

const RoomsEnvelope = z.object({ data: z.array(ChatRoomSchema) });
const MessagesPageEnvelope = z.object({
  data: z.array(MessageSchema),
  meta: CursorPageMeta,
});

export interface UseRoomMessagesInput {
  token: string | null;
  viewerId: string | null;
}

export interface UseRoomMessagesResult {
  rooms: ChatRoom[];
  filteredRooms: ChatRoom[];
  activeRoomId: string | null;
  activeRoom: ChatRoom | null;
  otherMember: ChatRoom["members"][number] | null;
  memberById: Map<string, ChatRoom["members"][number]>;
  otherOnline: boolean;
  messages: Message[];
  grouped: GroupedMessage<Message>[];
  hasMore: boolean;
  draft: string;
  sending: boolean;
  searchTerm: string;
  failedClientIds: Set<string>;
  error: string | null;
  actionMessage: Message | null;
  reportMessage: Message | null;
  editingBody: string;
  activeTyping: { userId: string; expiresAt: number } | null;
  firstUnreadIndex: number;
  unreadCount: number;
  otherLastReadAtMs: number;
  threadRef: MutableRefObject<HTMLDivElement | null>;
  firstUnreadRef: MutableRefObject<HTMLDivElement | null>;
  setActiveRoomId(roomId: string | null): void;
  setDraft(value: string): void;
  setSearchTerm(value: string): void;
  setError(value: string | null): void;
  setActionMessage(value: Message | null): void;
  setReportMessage(value: Message | null): void;
  setEditingBody(value: string): void;
  loadOlder(): void;
  scrollToUnread(): void;
  postTypingThrottled(): void;
  submit(): Promise<void>;
  retryFailed(clientMessageId: string): Promise<void>;
  saveEdit(): Promise<void>;
  deleteMessage(message: Message): Promise<void>;
}

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
      const asc = [...page.data].reverse();
      setMessages((prev) => (after ? [...asc, ...prev] : asc));
      setNextCursor(page.meta.nextCursor);
      setHasMore(page.meta.hasMore);
    },
    [token],
  );

  useEffect(() => {
    if (!activeRoomId || !token) return;
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

  const handleEvent = useCallback(
    (event: WsChatEvent): void => {
      if (event.type === "message.new") {
        const message = event.payload;
        setMessages((prev) => {
          if (message.roomId !== activeRoomId) return prev;
          const idx = prev.findIndex(
            (item) => item.clientMessageId && item.clientMessageId === message.clientMessageId,
          );
          if (idx >= 0) {
            const next = prev.slice();
            next[idx] = message;
            return next;
          }
          if (prev.some((item) => item.id === message.id)) return prev;
          return [...prev, message];
        });
        setRooms((prev) =>
          prev
            .map((room) => {
              if (room.id !== message.roomId) return room;
              const isActive = room.id === activeRoomId;
              return {
                ...room,
                lastMessage: message,
                unreadCount: isActive || message.authorId === viewerId ? 0 : room.unreadCount + 1,
                updatedAt: message.createdAt,
              };
            })
            .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)),
        );
        setTypingUserByRoom((prev) => {
          if (!prev[message.roomId]) return prev;
          const next = { ...prev };
          delete next[message.roomId];
          return next;
        });
        if (message.roomId === activeRoomId && token) {
          requestAnimationFrame(() => {
            if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
          });
          if (message.authorId !== viewerId) {
            void apiCall(`/messaging/rooms/${message.roomId}/read`, {
              method: "POST",
              token,
            }).catch(() => {});
          }
        }
      } else if (event.type === "message.edited" || event.type === "message.deleted") {
        const message = event.payload;
        setMessages((prev) => {
          if (message.roomId !== activeRoomId) return prev;
          return upsertMessage(prev, message);
        });
        setRooms((prev) =>
          prev.map((room) =>
            room.id === message.roomId
              ? { ...room, lastMessage: message, updatedAt: message.createdAt }
              : room,
          ),
        );
      } else if (event.type === "message.read") {
        const { roomId, userId, at } = event.payload;
        setRooms((prev) =>
          prev.map((room) => {
            if (room.id !== roomId) return room;
            return {
              ...room,
              members: room.members.map((member) =>
                member.userId === userId ? { ...member, lastReadAt: at } : member,
              ),
            };
          }),
        );
      } else if (event.type === "typing") {
        const { roomId, userId } = event.payload;
        if (userId === viewerId) return;
        setTypingUserByRoom((prev) => ({
          ...prev,
          [roomId]: { userId, expiresAt: Date.now() + TYPING_TTL_MS },
        }));
      }
    },
    [activeRoomId, token, viewerId],
  );

  const handleStreamError = useCallback(
    (message: "connectionLost" | "connectionFailed"): void => {
      setError(t(message));
    },
    [t],
  );

  useMessagesStream({ token, onEvent: handleEvent, onError: handleStreamError });

  useEffect(() => {
    if (Object.keys(typingUserByRoom).length === 0) return undefined;
    const intervalId = window.setInterval(() => {
      setTypingUserByRoom((prev) => {
        const now = Date.now();
        let changed = false;
        const next: typeof prev = {};
        for (const [roomId, entry] of Object.entries(prev)) {
          if (entry.expiresAt > now) next[roomId] = entry;
          else changed = true;
        }
        return changed ? next : prev;
      });
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, [typingUserByRoom]);

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
    void apiCall(`/messaging/rooms/${activeRoomId}/typing`, {
      method: "POST",
      token,
    }).catch(() => {});
  }, [activeRoomId, token]);

  const submit = useCallback(async (): Promise<void> => {
    if (!activeRoomId || !token || draft.trim().length === 0) return;
    setSending(true);
    setError(null);
    const clientMessageId = `web-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const optimistic: Message = {
      id: `pending-${clientMessageId}`,
      roomId: activeRoomId,
      authorId: viewerId ?? "me",
      body: draft.trim(),
      mediaUrl: null,
      clientMessageId,
      createdAt: new Date().toISOString(),
      editedAt: null,
      deletedAt: null,
    };
    setMessages((prev) => [...prev, optimistic]);
    setDraft("");
    requestAnimationFrame(() => {
      if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
    });
    try {
      const saved = await apiFetch(`/messaging/rooms/${activeRoomId}/messages`, MessageSchema, {
        method: "POST",
        token,
        body: { body: optimistic.body, clientMessageId },
      });
      setMessages((prev) => {
        const idx = prev.findIndex((item) => item.clientMessageId === clientMessageId);
        if (idx < 0) return prev;
        const next = prev.slice();
        next[idx] = saved;
        return next;
      });
    } catch (err) {
      setFailedClientIds((prev) => {
        const next = new Set(prev);
        next.add(clientMessageId);
        return next;
      });
      setError(err instanceof ApiRequestError ? t("sendFailed") : t("sendFailed"));
    } finally {
      setSending(false);
    }
  }, [activeRoomId, draft, t, token, viewerId]);

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
        const saved = await apiFetch(`/messaging/rooms/${activeRoomId}/messages`, MessageSchema, {
          method: "POST",
          token,
          body: { body: target.body, clientMessageId },
        });
        setMessages((prev) => {
          const idx = prev.findIndex((message) => message.clientMessageId === clientMessageId);
          if (idx < 0) return prev;
          const next = prev.slice();
          next[idx] = saved;
          return next;
        });
      } catch {
        setFailedClientIds((prev) => {
          const next = new Set(prev);
          next.add(clientMessageId);
          return next;
        });
      }
    },
    [activeRoomId, messages, token],
  );

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

  const activeRoom = useMemo(
    () => rooms.find((room) => room.id === activeRoomId) ?? null,
    [activeRoomId, rooms],
  );

  const otherMember = useMemo(() => {
    if (!activeRoom || !viewerId) return null;
    return activeRoom.members.find((member) => member.userId !== viewerId) ?? null;
  }, [activeRoom, viewerId]);

  const memberById = useMemo(() => {
    const map = new Map<string, ChatRoom["members"][number]>();
    for (const member of activeRoom?.members ?? []) {
      map.set(member.userId, member);
    }
    return map;
  }, [activeRoom]);

  const viewerLastReadAtMs = useMemo(() => {
    if (!activeRoom || !viewerId) return 0;
    const me = activeRoom.members.find((member) => member.userId === viewerId);
    return me?.lastReadAt ? Date.parse(me.lastReadAt) : 0;
  }, [activeRoom, viewerId]);

  const firstUnreadIndex = useMemo(() => {
    if (!viewerLastReadAtMs) return -1;
    return messages.findIndex((message) => Date.parse(message.createdAt) > viewerLastReadAtMs);
  }, [messages, viewerLastReadAtMs]);

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

  const otherLastReadAtMs = useMemo(() => {
    if (!otherMember?.lastReadAt) return 0;
    return Date.parse(otherMember.lastReadAt);
  }, [otherMember]);

  const otherOnline = useMemo(
    () =>
      otherMember?.lastSeenAt
        ? Date.now() - Date.parse(otherMember.lastSeenAt) < ONLINE_WINDOW_MS
        : false,
    [otherMember],
  );

  const filteredRooms = useMemo(() => {
    const q = searchTerm.trim().toLocaleLowerCase();
    if (!q) return rooms;
    return rooms.filter((room) => {
      const other = viewerId ? room.members.find((member) => member.userId !== viewerId) : null;
      const haystack = [
        other?.firstName,
        other?.lastName,
        other?.handle,
        room.title,
        room.lastMessage?.body,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase();
      return haystack.includes(q);
    });
  }, [rooms, searchTerm, viewerId]);

  const grouped = useMemo(
    () =>
      groupMessages(messages, {
        authorId: (message) => message.authorId,
        createdAt: (message) => message.createdAt,
      }),
    [messages],
  );

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
