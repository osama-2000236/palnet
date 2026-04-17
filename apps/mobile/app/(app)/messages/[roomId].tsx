import {
  ChatRoom as ChatRoomSchema,
  CursorPageMeta,
  Message as MessageSchema,
  type ChatRoom,
  type Message,
} from "@palnet/shared";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
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
import { getAccessToken, readSession } from "@/lib/session";

const MessagesPageEnvelope = z.object({
  data: z.array(MessageSchema),
  meta: CursorPageMeta,
});

const POLL_INTERVAL_MS = 4000;

export default function MessageThreadScreen(): JSX.Element {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ roomId: string }>();
  const roomId = params.roomId;
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [room, setRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
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
    } catch {
      setMessages((prev) =>
        prev.filter((x) => x.clientMessageId !== clientMessageId),
      );
      setError(t("messaging.sendFailed"));
    } finally {
      setSending(false);
    }
  }

  const other =
    viewerId && room
      ? (room.members.find((m) => m.userId !== viewerId) ?? null)
      : null;
  const title = other
    ? `${other.firstName} ${other.lastName}`.trim() || other.handle
    : (room?.title ?? "");

  return (
    <SafeAreaView className="flex-1 bg-surface-muted">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <View className="flex-row items-center gap-2 border-b border-ink-muted/10 bg-white px-4 py-3">
          <Pressable onPress={() => router.back()}>
            <Text className="text-brand-600">‹</Text>
          </Pressable>
          <Text className="text-base font-semibold text-ink">{title}</Text>
        </View>

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: 12, gap: 6 }}
          renderItem={({ item }) => (
            <MessageBubble message={item} mine={item.authorId === viewerId} />
          )}
          ListEmptyComponent={
            <View className="py-8">
              <Text className="text-center text-sm text-ink-muted">
                {t("messaging.emptyThread")}
              </Text>
            </View>
          }
          onContentSizeChange={() =>
            listRef.current?.scrollToEnd({ animated: false })
          }
        />

        {error ? (
          <View className="border-t border-red-200 bg-red-50 px-4 py-2">
            <Text className="text-sm text-red-700">{error}</Text>
          </View>
        ) : null}

        <View className="flex-row items-end gap-2 border-t border-ink-muted/10 bg-white p-2">
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={t("messaging.composePlaceholder")}
            multiline
            maxLength={5000}
            className="flex-1 rounded-md border border-ink-muted/30 px-3 py-2 text-sm text-ink"
          />
          <Pressable
            disabled={sending || draft.trim().length === 0}
            onPress={() => void submit()}
            className="rounded-md bg-brand-600 px-4 py-2 disabled:opacity-60"
          >
            {sending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-sm text-white">{t("messaging.send")}</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function MessageBubble({
  message,
  mine,
}: {
  message: Message;
  mine: boolean;
}): JSX.Element {
  return (
    <View
      className={`max-w-[75%] rounded-lg px-3 py-2 ${
        mine
          ? "self-end bg-brand-600"
          : "self-start bg-ink-muted/10"
      }`}
    >
      <Text className={mine ? "text-white" : "text-ink"}>{message.body}</Text>
    </View>
  );
}
