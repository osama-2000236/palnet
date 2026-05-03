// Message thread — ported to ui-native atoms.
// Uses MessageBubble (shared visual with web) with status derived from the
// same rules web uses (pending- id → sending, failed set → failed,
// otherLastReadAt → read, else sent).
//
// Mobile subscribes to the shared SSE stream and reconciles optimistic sends
// by clientMessageId, matching the web thread behavior.

import {
  ChatRoom as ChatRoomSchema,
  CursorPageMeta,
  Message as MessageSchema,
  WsChatEvent,
  type ChatRoom,
  type Message,
} from "@baydar/shared";
import {
  AppHeader,
  Button,
  Icon,
  MessageBubble,
  Sheet,
  Surface,
  nativeTokens,
  type MessageBubbleLabels,
  type MessageStatus,
} from "@baydar/ui-native";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { z } from "zod";

import { apiCall, apiFetch, apiFetchPage } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-errors";
import { track } from "@/lib/analytics";
import { successHaptic, tapHaptic } from "@/lib/haptics";
import { readSession } from "@/lib/session";
import { subscribeSse } from "@/lib/sse";
import { useNetworkStore } from "@/store/network";

const MessagesPageEnvelope = z.object({
  data: z.array(MessageSchema),
  meta: CursorPageMeta,
});

export default function MessageThreadScreen(): JSX.Element {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const params = useLocalSearchParams<{ roomId: string }>();
  const roomId = params.roomId;
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
  const [editingBody, setEditingBody] = useState("");
  const listRef = useRef<FlatList<Message> | null>(null);
  const didInitialScrollRef = useRef(false);
  const isConnected = useNetworkStore((state) => state.isConnected);

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
    return subscribeSse({
      path: "/messaging/stream",
      token,
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
      failedHint: t("messaging.failedHint"),
      statusSending: t("messaging.status.sending"),
      statusSent: t("messaging.status.sent"),
      statusDelivered: t("messaging.status.delivered"),
      statusRead: t("messaging.status.read"),
      statusFailed: t("messaging.status.failed"),
      editedSuffix: t("messaging.editedSuffix"),
      deletedBody: t("messaging.deletedBody"),
    }),
    [t],
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: nativeTokens.color.surfaceMuted }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <View
          style={{
            backgroundColor: nativeTokens.color.surface,
            paddingHorizontal: nativeTokens.space[4],
          }}
        >
          <AppHeader
            title={title || t("messaging.title")}
            compact
            trailing={
              <Button variant="ghost" size="sm" onPress={() => router.back()}>
                {t("common.back")}
              </Button>
            }
          />
        </View>

        {unreadCount > 0 ? (
          <Pressable
            onPress={() => scrollToUnread(true)}
            accessibilityRole="button"
            accessibilityLabel={t("messaging.unreadJump.accessibility", { count: unreadCount })}
            style={{
              alignSelf: "center",
              marginTop: nativeTokens.space[2],
              borderRadius: nativeTokens.radius.full,
              backgroundColor: nativeTokens.color.brand100,
              paddingHorizontal: nativeTokens.space[3],
              paddingVertical: nativeTokens.space[1],
            }}
          >
            <Text
              style={{
                color: nativeTokens.color.brand700,
                fontFamily: nativeTokens.type.family.sans,
                fontSize: nativeTokens.type.scale.caption.size,
                fontWeight: "700",
              }}
            >
              {t("messaging.unreadJump.banner", { count: unreadCount })}
            </Text>
          </Pressable>
        ) : null}

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{
            padding: nativeTokens.space[3],
            gap: nativeTokens.space[2],
          }}
          renderItem={({ item, index }) => {
            const prev = messages[index - 1];
            const next = messages[index + 1];
            const mine = item.authorId === viewerId;
            const prevSameAuthor = prev && prev.authorId === item.authorId;
            const nextSameAuthor = next && next.authorId === item.authorId;
            const tail = !nextSameAuthor;
            const status: MessageStatus | undefined = mine
              ? computeStatus(item, failedClientIds, otherLastReadAtMs)
              : undefined;
            const author = memberById.get(item.authorId);
            return (
              <View style={{ marginTop: prevSameAuthor ? 0 : nativeTokens.space[2] }}>
                <Pressable
                  disabled={!mine || item.id.startsWith("pending-") || Boolean(item.deletedAt)}
                  onLongPress={() => openMessageActions(item)}
                  accessibilityRole={mine ? "button" : "text"}
                >
                  <MessageBubble
                    side={mine ? "mine" : "theirs"}
                    tail={tail}
                    timestamp={tail ? shortTime(item.createdAt, locale) : null}
                    status={status}
                    authorName={!mine ? otherName : undefined}
                    groupAuthor={
                      !mine && room?.isGroup && author
                        ? {
                            id: author.userId,
                            handle: author.handle,
                            firstName: author.firstName,
                            lastName: author.lastName,
                            avatarUrl: author.avatarUrl ?? null,
                          }
                        : undefined
                    }
                    edited={Boolean(item.editedAt)}
                    deleted={Boolean(item.deletedAt)}
                    onRetry={
                      item.clientMessageId
                        ? () => retryFailed(item.clientMessageId as string)
                        : undefined
                    }
                    labels={labels}
                  >
                    {item.body}
                  </MessageBubble>
                </Pressable>
              </View>
            );
          }}
          ListEmptyComponent={
            <Surface variant="tinted" padding="6">
              <Text
                style={{
                  color: nativeTokens.color.inkMuted,
                  fontFamily: nativeTokens.type.family.sans,
                  fontSize: nativeTokens.type.scale.body.size,
                  textAlign: "center",
                }}
              >
                {t("messaging.emptyThread")}
              </Text>
            </Surface>
          }
          onScrollToIndexFailed={() => {
            listRef.current?.scrollToEnd({ animated: false });
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void refreshThread()}
              tintColor={nativeTokens.color.brand600}
              colors={[nativeTokens.color.brand600]}
            />
          }
        />

        {error ? (
          <View
            accessibilityRole="alert"
            style={{
              borderTopWidth: 1,
              borderTopColor: nativeTokens.color.danger,
              backgroundColor: nativeTokens.color.dangerSoft,
              paddingHorizontal: nativeTokens.space[4],
              paddingVertical: nativeTokens.space[2],
            }}
          >
            <Text
              style={{
                color: nativeTokens.color.danger,
                fontFamily: nativeTokens.type.family.sans,
                fontSize: nativeTokens.type.scale.small.size,
              }}
            >
              {error}
            </Text>
          </View>
        ) : null}

        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-end",
            gap: nativeTokens.space[2],
            borderTopWidth: 1,
            borderTopColor: nativeTokens.color.lineSoft,
            backgroundColor: nativeTokens.color.surface,
            padding: nativeTokens.space[2],
          }}
        >
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={t("messaging.composePlaceholder")}
            placeholderTextColor={nativeTokens.color.inkMuted}
            multiline
            maxLength={5000}
            style={{
              flex: 1,
              borderRadius: nativeTokens.radius.md,
              borderWidth: 1,
              borderColor: nativeTokens.color.lineHard,
              paddingHorizontal: nativeTokens.space[3],
              paddingVertical: nativeTokens.space[2],
              color: nativeTokens.color.ink,
              fontFamily: nativeTokens.type.family.sans,
              fontSize: nativeTokens.type.scale.body.size,
              maxHeight: nativeTokens.space[24] + nativeTokens.space[6],
            }}
          />
          <Button
            disabled={sending || draft.trim().length === 0}
            onPress={() => void submit()}
            loading={sending}
            accessibilityLabel={t("messaging.send")}
            testID="messages-send-button"
            size="lg"
            leading={<Icon name="send" size={18} color={nativeTokens.color.inkInverse} />}
          >
            {t("messaging.send")}
          </Button>
        </View>

        <Sheet
          open={Boolean(actionMessage)}
          onClose={() => {
            setActionMessage(null);
            setEditingBody("");
          }}
          title={t("messaging.edit.sheetTitle")}
          closeLabel={t("common.cancel", { defaultValue: "إلغاء" })}
        >
          <TextInput
            value={editingBody}
            onChangeText={setEditingBody}
            multiline
            maxLength={5000}
            placeholder={t("messaging.composePlaceholder")}
            placeholderTextColor={nativeTokens.color.inkMuted}
            style={{
              minHeight: nativeTokens.space[24],
              borderRadius: nativeTokens.radius.md,
              borderWidth: 1,
              borderColor: nativeTokens.color.lineHard,
              paddingHorizontal: nativeTokens.space[3],
              paddingVertical: nativeTokens.space[2],
              color: nativeTokens.color.ink,
              fontFamily: nativeTokens.type.family.sans,
              fontSize: nativeTokens.type.scale.body.size,
              textAlignVertical: "top",
            }}
          />
          <Pressable
            disabled={editingBody.trim().length === 0}
            onPress={() => void saveEdit()}
            accessibilityRole="button"
            style={{
              minHeight: nativeTokens.chrome.minHit,
              borderRadius: nativeTokens.radius.md,
              backgroundColor: nativeTokens.color.brand600,
              alignItems: "center",
              justifyContent: "center",
              opacity: editingBody.trim().length === 0 ? 0.6 : 1,
            }}
          >
            <Text
              style={{
                color: nativeTokens.color.inkInverse,
                fontFamily: nativeTokens.type.family.sans,
                fontSize: nativeTokens.type.scale.body.size,
                fontWeight: "700",
              }}
            >
              {t("messaging.edit.save")}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => void deleteSelected()}
            accessibilityRole="button"
            style={{
              minHeight: nativeTokens.chrome.minHit,
              borderRadius: nativeTokens.radius.md,
              borderWidth: 1,
              borderColor: nativeTokens.color.danger,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                color: nativeTokens.color.danger,
                fontFamily: nativeTokens.type.family.sans,
                fontSize: nativeTokens.type.scale.body.size,
                fontWeight: "700",
              }}
            >
              {t("messaging.delete.action")}
            </Text>
          </Pressable>
        </Sheet>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── helpers ─────────────────────────────────────────────────────────────

function computeStatus(
  m: Message,
  failedClientIds: Set<string>,
  otherLastReadAtMs: number,
): MessageStatus {
  if (m.clientMessageId && failedClientIds.has(m.clientMessageId)) {
    return "failed";
  }
  if (m.id.startsWith("pending-")) return "sending";
  const createdAtMs = Date.parse(m.createdAt);
  if (otherLastReadAtMs >= createdAtMs) return "read";
  return "sent";
}

function upsertMessage(current: Message[], incoming: Message): Message[] {
  const idx = current.findIndex(
    (item) =>
      item.id === incoming.id ||
      (!!item.clientMessageId && item.clientMessageId === incoming.clientMessageId),
  );
  if (idx === -1) return [...current, incoming];
  const next = current.slice();
  next[idx] = incoming;
  return next;
}

function shortTime(iso: string, locale: string): string {
  try {
    const tag = locale.toLowerCase().startsWith("ar") ? `${locale}-u-nu-arab` : locale;
    return new Date(iso).toLocaleTimeString(tag, {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}
