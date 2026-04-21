// Messages list — room roster. Uses ui-native Surface + Avatar so rows look
// like the web `/messages` left rail instead of the raw-RN cards.

import {
  ChatRoom as ChatRoomSchema,
  type ChatRoom,
} from "@palnet/shared";
import { Avatar, Surface, nativeTokens } from "@palnet/ui-native";
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

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: nativeTokens.color.surfaceMuted }}
    >
      <View
        style={{
          flex: 1,
          paddingHorizontal: nativeTokens.space[4],
          paddingTop: nativeTokens.space[8],
        }}
      >
        <Text
          style={{
            marginBottom: nativeTokens.space[3],
            color: nativeTokens.color.ink,
            fontFamily: nativeTokens.type.family.sans,
            fontSize: nativeTokens.type.scale.display.size,
            lineHeight: nativeTokens.type.scale.display.line,
            fontWeight: "700",
          }}
        >
          {t("messaging.title")}
        </Text>

        <FlatList
          data={rooms}
          keyExtractor={(r) => r.id}
          renderItem={({ item }) => (
            <RoomRow room={item} viewerId={viewerId} />
          )}
          ItemSeparatorComponent={() => (
            <View style={{ height: nativeTokens.space[2] }} />
          )}
          ListEmptyComponent={
            loading ? null : (
              <Surface variant="tinted" padding="6">
                <Text
                  style={{
                    color: nativeTokens.color.inkMuted,
                    fontFamily: nativeTokens.type.family.sans,
                    fontSize: nativeTokens.type.scale.body.size,
                    textAlign: "center",
                  }}
                >
                  {t("messaging.emptyList")}
                </Text>
              </Surface>
            )
          }
          ListFooterComponent={
            loading ? (
              <View style={{ paddingVertical: nativeTokens.space[4] }}>
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
  const avatarUser = other
    ? {
        id: other.userId,
        handle: other.handle,
        firstName: other.firstName,
        lastName: other.lastName,
        avatarUrl: other.avatarUrl ?? null,
      }
    : null;

  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: "/(app)/messages/[roomId]",
          params: { roomId: room.id },
        })
      }
      accessibilityRole="link"
      accessibilityLabel={label}
    >
      <Surface variant="card" padding="3">
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: nativeTokens.space[3],
          }}
        >
          <Avatar user={avatarUser} size="md" />

          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              numberOfLines={1}
              style={{
                color: nativeTokens.color.ink,
                fontFamily: nativeTokens.type.family.sans,
                fontSize: nativeTokens.type.scale.h3.size,
                lineHeight: nativeTokens.type.scale.h3.line,
                fontWeight: "600",
              }}
            >
              {label}
            </Text>
            {room.lastMessage ? (
              <Text
                numberOfLines={1}
                style={{
                  color: nativeTokens.color.inkMuted,
                  fontFamily: nativeTokens.type.family.sans,
                  fontSize: nativeTokens.type.scale.small.size,
                }}
              >
                {room.lastMessage.body}
              </Text>
            ) : null}
          </View>

          {room.unreadCount > 0 ? (
            <View
              style={{
                marginStart: nativeTokens.space[2],
                minWidth: 22,
                height: 22,
                paddingHorizontal: 7,
                borderRadius: nativeTokens.radius.full,
                backgroundColor: nativeTokens.color.accent600,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  color: nativeTokens.color.inkInverse,
                  fontFamily: nativeTokens.type.family.sans,
                  fontSize: 11,
                  fontWeight: "700",
                }}
              >
                {room.unreadCount}
              </Text>
            </View>
          ) : null}
        </View>
      </Surface>
    </Pressable>
  );
}
