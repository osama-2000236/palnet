// Message thread — ported to ui-native atoms.
// Uses MessageBubble (shared visual with web) with status derived from the
// same rules web uses (pending- id → sending, failed set → failed,
// otherLastReadAt → read, else sent).
//
// No SSE yet on mobile; 4s polling reconciles state. That means "sending"
// only flashes briefly; the rest of the time messages arrive as "sent" or
// "read" straight from the server.

import {
  ChatRoom as ChatRoomSchema,
  CursorPageMeta,
  Message as MessageSchema,
  type ChatRoom,
  type Message,
} from "@palnet/shared";
import {
  MessageBubble,
  Surface,
  nativeTokens,
  type MessageBubbleLabels,
  type MessageStatus,
} from "@palnet/ui-native";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  Text,
  TextInput,
  View,
} from "react-native";
import { z } from "zod";

import { apiCall, apiFetch, apiFetchPage } from "@/lib/api";
import { readSession } from "@/lib/session";

const MessagesPageEnvelope = z.object({
  data: z.array(MessageSchema),
  meta: CursorPageMeta,
});

const POLL_INTERVAL_MS = 4000;

export default function MessageThreadScreen(): JSX.Element {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const params = useLocalSearchParams<{ roomId: string }>();
  const roomId = params.roomId;
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [room, setRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [failedClientIds, setFailedClientIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<FlatList<Message> | null>(null);

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
        apiFetchPage(
          `/messaging/rooms/${roomId}/messages?limit=30`,
          MessagesPageEnvelope,
          { token },
        ),
      ]);
      setRoom(r);
      setMessages([...page.data].reverse());
    } catch {
      // keep existing state
    }
  }, [token, roomId]);

  useEffect(() => {
    if (!token || !roomId) return;
    void refresh().then(() => {
      void apiCall(`/messaging/rooms/${roomId}/read`, {
        method: "POST",
        token,
      }).catch(() => {});
    });
    const timer = setInterval(() => void refresh(), POLL_INTERVAL_MS);
    return (): void => clearInterval(timer);
  }, [token, roomId, refresh]);

  const sendBody = useCallback(
    async (text: string, clientMessageId: string): Promise<void> => {
      if (!token || !roomId) return;
      try {
        const saved = await apiFetch(
          `/messaging/rooms/${roomId}/messages`,
          MessageSchema,
          {
            method: "POST",
            token,
            body: { body: text, clientMessageId },
          },
        );
        setMessages((prev) =>
          prev.map((x) =>
            x.clientMessageId === clientMessageId ? saved : x,
          ),
        );
        setFailedClientIds((prev) => {
          if (!prev.has(clientMessageId)) return prev;
          const next = new Set(prev);
          next.delete(clientMessageId);
          return next;
        });
      } catch {
        setFailedClientIds((prev) => {
          const next = new Set(prev);
          next.add(clientMessageId);
          return next;
        });
        setError(t("messaging.sendFailed"));
      }
    },
    [token, roomId, t],
  );

  async function submit(): Promise<void> {
    if (!token || !roomId || draft.trim().length === 0) return;
    setSending(true);
    setError(null);
    const clientMessageId = `mob-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;
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
      const target = messages.find(
        (m) => m.clientMessageId === clientMessageId,
      );
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

  const other = useMemo(
    () =>
      viewerId && room
        ? (room.members.find((m) => m.userId !== viewerId) ?? null)
        : null,
    [viewerId, room],
  );
  const otherName = other
    ? `${other.firstName} ${other.lastName}`.trim() || other.handle
    : "";
  const title = otherName || (room?.title ?? "");

  const otherLastReadAtMs = useMemo(() => {
    if (!other?.lastReadAt) return 0;
    return Date.parse(other.lastReadAt);
  }, [other]);

  const labels: MessageBubbleLabels = useMemo(
    () => ({
      ownPrefix: (time) => t("messaging.ownPrefix", { time }),
      otherPrefix: (name, time) =>
        t("messaging.otherPrefix", { name, time }),
      failedHint: t("messaging.failedHint"),
      statusSending: t("messaging.status.sending"),
      statusSent: t("messaging.status.sent"),
      statusDelivered: t("messaging.status.delivered"),
      statusRead: t("messaging.status.read"),
      statusFailed: t("messaging.status.failed"),
    }),
    [t],
  );

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: nativeTokens.color.surfaceMuted }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: nativeTokens.space[2],
            borderBottomWidth: 1,
            borderBottomColor: nativeTokens.color.lineSoft,
            backgroundColor: nativeTokens.color.surface,
            paddingHorizontal: nativeTokens.space[4],
            paddingVertical: nativeTokens.space[3],
          }}
        >
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            accessibilityRole="button"
          >
            <Text
              style={{
                color: nativeTokens.color.brand600,
                fontSize: nativeTokens.type.scale.h3.size,
                fontFamily: nativeTokens.type.family.sans,
              }}
            >
              ‹
            </Text>
          </Pressable>
          <Text
            numberOfLines={1}
            style={{
              flex: 1,
              color: nativeTokens.color.ink,
              fontFamily: nativeTokens.type.family.sans,
              fontSize: nativeTokens.type.scale.body.size,
              fontWeight: "600",
            }}
          >
            {title}
          </Text>
        </View>

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{
            padding: nativeTokens.space[3],
            gap: 6,
          }}
          renderItem={({ item, index }) => {
            const prev = messages[index - 1];
            const next = messages[index + 1];
            const mine = item.authorId === viewerId;
            const prevSameAuthor =
              prev && prev.authorId === item.authorId;
            const nextSameAuthor =
              next && next.authorId === item.authorId;
            const tail = !nextSameAuthor;
            const status: MessageStatus | undefined = mine
              ? computeStatus(item, failedClientIds, otherLastReadAtMs)
              : undefined;
            return (
              <View style={{ marginTop: prevSameAuthor ? 0 : 6 }}>
                <MessageBubble
                  side={mine ? "mine" : "theirs"}
                  tail={tail}
                  timestamp={tail ? shortTime(item.createdAt, locale) : null}
                  status={status}
                  authorName={!mine ? otherName : undefined}
                  onRetry={
                    item.clientMessageId
                      ? () =>
                          retryFailed(item.clientMessageId as string)
                      : undefined
                  }
                  labels={labels}
                >
                  {item.body}
                </MessageBubble>
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
          onContentSizeChange={() =>
            listRef.current?.scrollToEnd({ animated: false })
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
              maxHeight: 120,
            }}
          />
          <Pressable
            disabled={sending || draft.trim().length === 0}
            onPress={() => void submit()}
            accessibilityRole="button"
            style={({ pressed }) => ({
              borderRadius: nativeTokens.radius.md,
              backgroundColor: nativeTokens.color.brand600,
              paddingHorizontal: nativeTokens.space[4],
              paddingVertical: nativeTokens.space[2],
              opacity:
                sending || draft.trim().length === 0
                  ? 0.6
                  : pressed
                    ? 0.85
                    : 1,
            })}
          >
            {sending ? (
              <ActivityIndicator color={nativeTokens.color.inkInverse} />
            ) : (
              <Text
                style={{
                  color: nativeTokens.color.inkInverse,
                  fontFamily: nativeTokens.type.family.sans,
                  fontSize: nativeTokens.type.scale.body.size,
                  fontWeight: "600",
                }}
              >
                {t("messaging.send")}
              </Text>
            )}
          </Pressable>
        </View>
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

function shortTime(iso: string, locale: string): string {
  try {
    const tag = locale.toLowerCase().startsWith("ar")
      ? `${locale}-u-nu-arab`
      : locale;
    return new Date(iso).toLocaleTimeString(tag, {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}
