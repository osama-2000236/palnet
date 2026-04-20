import {
  ChatRoom as ChatRoomSchema,
  type ChatRoom,
} from "@palnet/shared";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SafeAreaView,
  Text,
  View,
} from "react-native";
import { z } from "zod";

import { apiFetchPage } from "@/lib/api";
import { getAccessToken, readSession } from "@/lib/session";

const RoomsEnvelope = z.object({ data: z.array(ChatRoomSchema) });

export default function MessagesListScreen(): JSX.Element {
  const { t } = useTranslation();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (): Promise<void> => {
    const token = await getAccessToken();
    if (!token) return;
    setLoading(true);
    try {
      const out = await apiFetchPage("/messaging/rooms", RoomsEnvelope, {
        token,
      });
      setRooms(out.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      const session = await readSession();
      if (!session) {
        router.replace("/(auth)/login");
        return;
      }
      setViewerId(session.user.id);
      await load();
    })();
  }, [load]);

  // Re-fetch every time the screen gains focus — cheap polling.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <SafeAreaView className="flex-1 bg-surface-muted">
      <View className="flex-1 px-4 pt-8">
        <Text className="mb-3 text-3xl font-bold text-ink">
          {t("messaging.title")}
        </Text>

        <FlatList
          data={rooms}
          keyExtractor={(r) => r.id}
          renderItem={({ item }) => (
            <RoomRow room={item} viewerId={viewerId} />
          )}
          ItemSeparatorComponent={() => <View className="h-2" />}
          ListEmptyComponent={
            loading ? null : (
              <View className="rounded-md border border-ink-muted/20 bg-surface p-6">
                <Text className="text-ink-muted">
                  {t("messaging.emptyList")}
                </Text>
              </View>
            )
          }
          ListFooterComponent={
            loading ? (
              <View className="py-4">
                <ActivityIndicator />
              </View>
            ) : null
          }
        />
      </View>
    </SafeAreaView>
  );
}

function RoomRow({
  room,
  viewerId,
}: {
  room: ChatRoom;
  viewerId: string | null;
}): JSX.Element {
  const other = viewerId
    ? room.members.find((m) => m.userId !== viewerId)
    : null;
  const label = other
    ? `${other.firstName} ${other.lastName}`.trim() || other.handle
    : (room.title ?? room.id);
  return (
    <Pressable
      onPress={() => router.push(`/(app)/messages/${room.id}`)}
      className="flex-row items-center justify-between rounded-md border border-ink-muted/20 bg-surface px-4 py-3"
    >
      <View className="flex-1">
        <Text className="text-base font-semibold text-ink">{label}</Text>
        {room.lastMessage ? (
          <Text className="text-sm text-ink-muted" numberOfLines={1}>
            {room.lastMessage.body}
          </Text>
        ) : null}
      </View>
      {room.unreadCount > 0 ? (
        <View className="ms-2 rounded-full bg-accent-600 px-2 py-0.5">
          <Text className="text-xs text-ink-inverse">{room.unreadCount}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}
