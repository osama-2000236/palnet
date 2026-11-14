import {
  ChatRoom as ChatRoomSchema,
  CursorPageMeta,
  Message as MessageSchema,
  ReportReason,
  WsChatEvent,
  type ChatRoom,
  type Message,
} from "@baydar/shared";
import type { MessageBubbleLabels, ReportSheetLabels } from "@baydar/ui-native";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { FlatList } from "react-native";
import { z } from "zod";

import { useReport } from "@/api/safety";
import { apiCall, apiFetch, apiFetchPage, getFreshAccessToken } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-errors";
import { track } from "@/lib/analytics";
import { successHaptic, tapHaptic } from "@/lib/haptics";
import { readSession } from "@/lib/session";
import { subscribeSse } from "@/lib/sse";
import { useNetworkStore } from "@/store/network";

import { upsertMessage } from "./thread-helpers";

const MessagesPageEnvelope = z.object({
  data: z.array(MessageSchema),
  meta: CursorPageMeta,
});

export function useRoomThread(roomId: string | undefined) {
  const { t } = useTranslation();
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [room, setRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
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
  const report = useReport();

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
      const [r, page] = await Promise.all([
        apiFetch(`/messaging/rooms/${roomId}`, ChatRoomSchema, { token }),
        apiFetchPage(`/messaging/rooms/${roomId}/messages?limit=30`, MessagesPageEnvelope, {
          token,
        }),
      ]);
      setRoom(r);
      setMessages([...page.data].reverse());
      didInitialScrollRef.current = false;
    } catch (caught) {
      setError(apiErrorMessage(t, caught));
    }
  }, [token, roomId, t]);

  useEffect(() => {
    if (!token || !roomId || !isConnected) return;
    void refresh().then(() => {
      void apiCall(`/messaging/rooms/${roomId}/read`, {
        method: "POST",
        token,
      }).catch(() => {});
    });
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    void getFreshAccessToken().then((freshToken) => {
      if (!freshToken || cancelled) return;
      unsubscribe = subscribeSse({
        path: "/messaging/stream",
        token: freshToken,
        schema: WsChatEvent,
        onEvent: (event) => {
          if (event.type === "message.new" && event.payload.roomId === roomId) {
            setMessages((prev) => upsertMessage(prev, event.payload));
            void apiCall(`/messaging/rooms/${roomId}/read`, {
              method: "POST",
              token,
            }).catch(() => {});
          }
          if (
            (event.type === "message.edited" || event.type === "message.deleted") &&
            event.payload.roomId === roomId
          ) {
            setMessages((prev) => upsertMessage(prev, event.payload));
          }
          if (event.type === "message.read" && event.payload.roomId === roomId) {
            setRoom((current) =>
              current
                ? {
                    ...current,
                    members: current.members.map((member) =>
                      member.userId === event.payload.userId
                        ? { ...member, lastReadAt: event.payload.at }
                        : member,
                    ),
                  }
                : current,
            );
          }
        },
      });
    });
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [token, roomId, refresh, isConnected]);

  const refreshThread = useCallback(async (): Promise<void> => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

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
        setFailedClientIds((prev) => {
          const next = new Set(prev);
          next.add(clientMessageId);
          return next;
        });
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
    const optimistic: Message = {
      id: `pending-${clientMessageId}`,
      roomId,
      authorId: viewerId ?? "me",
      body: text,
      mediaUrl: null,
      clientMessageId,
      createdAt: new Date().toISOString(),
      editedAt: null,
      deletedAt: null,
    };
    setMessages((prev) => [...prev, optimistic]);
    setDraft("");
    try {
      await sendBody(text, clientMessageId);
    } finally {
      setSending(false);
    }
  }

  const retryFailed = useCallback(
    (clientMessageId: string): void => {
      const target = messages.find((m) => m.clientMessageId === clientMessageId);
      if (!target) return;
      setFailedClientIds((prev) => {
        if (!prev.has(clientMessageId)) return prev;
        const next = new Set(prev);
        next.delete(clientMessageId);
        return next;
      });
      void sendBody(target.body, clientMessageId);
    },
    [messages, sendBody],
  );

  const openMessageActions = useCallback((message: Message): void => {
    setActionMessage(message);
    setEditingBody(message.body);
  }, []);

  const saveEdit = useCallback(async (): Promise<void> => {
    if (!token || !actionMessage) return;
    try {
      const saved = await apiFetch(`/messaging/messages/${actionMessage.id}`, MessageSchema, {
        method: "PATCH",
        token,
        body: { body: editingBody.trim() },
      });
      setMessages((prev) => upsertMessage(prev, saved));
      setActionMessage(null);
      setEditingBody("");
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
      setActionMessage(null);
      setEditingBody("");
      successHaptic();
    } catch (caught) {
      setError(apiErrorMessage(t, caught));
    }
  }, [actionMessage, token, t]);

  const other = useMemo(
    () => (viewerId && room ? (room.members.find((m) => m.userId !== viewerId) ?? null) : null),
    [viewerId, room],
  );
  const otherName = other ? `${other.firstName} ${other.lastName}`.trim() || other.handle : "";
  const title = room?.isGroup ? (room.title ?? "") : otherName || (room?.title ?? "");

  const otherLastReadAtMs = useMemo(() => {
    if (!other?.lastReadAt) return 0;
    return Date.parse(other.lastReadAt);
  }, [other]);

  const memberById = useMemo(() => {
    const map = new Map<string, NonNullable<ChatRoom["members"][number]>>();
    for (const member of room?.members ?? []) {
      map.set(member.userId, member);
    }
    return map;
  }, [room]);

  const viewerLastReadAtMs = useMemo(() => {
    if (!viewerId || !room) return 0;
    const me = room.members.find((member) => member.userId === viewerId);
    return me?.lastReadAt ? Date.parse(me.lastReadAt) : 0;
  }, [room, viewerId]);

  const firstUnreadIndex = useMemo(() => {
    if (!viewerLastReadAtMs) return -1;
    return messages.findIndex((message) => Date.parse(message.createdAt) > viewerLastReadAtMs);
  }, [messages, viewerLastReadAtMs]);

  const unreadCount = firstUnreadIndex >= 0 ? messages.length - firstUnreadIndex : 0;

  const scrollToUnread = useCallback(
    (animated: boolean): void => {
      if (messages.length === 0) return;
      if (firstUnreadIndex >= 0) {
        listRef.current?.scrollToIndex({
          index: firstUnreadIndex,
          viewPosition: 0.5,
          animated,
        });
      } else {
        listRef.current?.scrollToEnd({ animated });
      }
    },
    [firstUnreadIndex, messages.length],
  );

  useEffect(() => {
    if (didInitialScrollRef.current || messages.length === 0) return;
    didInitialScrollRef.current = true;
    requestAnimationFrame(() => scrollToUnread(false));
  }, [messages.length, scrollToUnread]);

  const labels: MessageBubbleLabels = useMemo(
    () => ({
      ownPrefix: (time) => t("messaging.ownPrefix", { time }),
      otherPrefix: (name, time) => t("messaging.otherPrefix", { name, time }),
      failedHint: t("messages.send.retry"),
      statusSending: t("messaging.status.sending"),
      statusSent: t("messaging.status.sent"),
      statusDelivered: t("messaging.status.delivered"),
      statusRead: t("messaging.status.read"),
      statusFailed: t("messages.send.failed"),
      editedSuffix: t("messaging.editedSuffix"),
      deletedBody: t("messaging.deletedBody"),
    }),
    [t],
  );
  const reportLabels: ReportSheetLabels = useMemo(
    () => ({
      title: t("safety.report.title"),
      detailsLabel: t("safety.report.details_label"),
      cancel: t("common.cancel"),
      submit: t("safety.report.submit"),
      close: t("safety.report.close"),
      reasons: {
        [ReportReason.SPAM]: t("safety.report.reason.spam"),
        [ReportReason.HARASSMENT]: t("safety.report.reason.harassment"),
        [ReportReason.HATE]: t("safety.report.reason.hate"),
        [ReportReason.MISINFORMATION]: t("safety.report.reason.misinformation"),
        [ReportReason.NUDITY]: t("safety.report.reason.nudity"),
        [ReportReason.VIOLENCE]: t("safety.report.reason.violence"),
        [ReportReason.OTHER]: t("safety.report.reason.other"),
      },
    }),
    [t],
  );

  return {
    t,
    room,
    messages,
    failedClientIds,
    draft,
    setDraft,
    sending,
    refreshing,
    error,
    setError,
    actionMessage,
    setActionMessage,
    reportMessage,
    setReportMessage,
    editingBody,
    setEditingBody,
    listRef,
    viewerId,
    otherName,
    title,
    otherLastReadAtMs,
    memberById,
    unreadCount,
    labels,
    reportLabels,
    report,
    submit,
    retryFailed,
    openMessageActions,
    saveEdit,
    deleteSelected,
    scrollToUnread,
    refreshThread,
  };
}
