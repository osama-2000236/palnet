// Messages list — room roster. Uses ui-native Surface + Avatar so rows look
// like the web `/messages` left rail instead of the raw-RN cards.

import { ChatRoom as ChatRoomSchema, type ChatRoom } from "@baydar/shared";
import { Surface, nativeTokens } from "@baydar/ui-native";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  SafeAreaView,
  Text,
  View,
} from "react-native";
import { z } from "zod";

import { RoomRow } from "@/components/rows/RoomRow";
import { apiCall, apiFetchPage } from "@/lib/api";
import { successHaptic, tapHaptic } from "@/lib/haptics";
import { getAccessToken, readSession } from "@/lib/session";

const RoomsEnvelope = z.object({ data: z.array(ChatRoomSchema) });

export default function MessagesListScreen(): JSX.Element {
  const { t } = useTranslation();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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

  const refresh = useCallback(async (): Promise<void> => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const archiveRoom = useCallback(async (roomId: string): Promise<void> => {
    const token = await getAccessToken();
    if (!token) return;
    tapHaptic();
    await apiCall(`/messaging/rooms/${roomId}/archive`, {
      method: "POST",
      token,
    });
    setRooms((prev) => prev.filter((room) => room.id !== roomId));
    successHaptic();
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
    <SafeAreaView style={{ flex: 1, backgroundColor: nativeTokens.color.surfaceMuted }}>
      <View
        style={{
          flex: 1,
          paddingHorizontal: nativeTokens.space[4],
          paddingTop: nativeTokens.space[8],
        }}
      >
        <View
          style={{
            marginBottom: nativeTokens.space[3],
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: nativeTokens.space[3],
          }}
        >
          <Text
            style={{
              color: nativeTokens.color.ink,
              fontFamily: nativeTokens.type.family.sans,
              fontSize: nativeTokens.type.scale.display.size,
              lineHeight: nativeTokens.type.scale.display.line,
              fontWeight: "700",
            }}
          >
            {t("messaging.title")}
          </Text>
          <Pressable
            onPress={() => router.push("/(app)/messages/new")}
            accessibilityRole="button"
            accessibilityLabel={t("messaging.newGroup.title")}
            style={{
              minHeight: 44,
              borderRadius: nativeTokens.radius.full,
              backgroundColor: nativeTokens.color.brand600,
              paddingHorizontal: nativeTokens.space[3],
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                color: nativeTokens.color.inkInverse,
                fontFamily: nativeTokens.type.family.sans,
                fontSize: nativeTokens.type.scale.small.size,
                fontWeight: "700",
              }}
            >
              {t("messaging.newMessage")}
            </Text>
          </Pressable>
        </View>

        <FlatList
          data={rooms}
          keyExtractor={(r) => r.id}
          renderItem={({ item }) => (
            <RoomRow
              room={item}
              viewerId={viewerId}
              archiveLabel={t("messaging.archive")}
              onArchive={(roomId) => void archiveRoom(roomId)}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: nativeTokens.space[2] }} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void refresh()}
              tintColor={nativeTokens.color.brand600}
              colors={[nativeTokens.color.brand600]}
            />
          }
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
