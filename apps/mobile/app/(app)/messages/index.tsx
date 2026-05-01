// Messages list — room roster. Uses ui-native Surface + Avatar so rows look
// like the web `/messages` left rail instead of the raw-RN cards.

import { ChatRoom as ChatRoomSchema, type ChatRoom } from "@baydar/shared";
import { AppHeader, Button, Icon, RecordCardSkeleton, nativeTokens } from "@baydar/ui-native";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, RefreshControl, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { z } from "zod";

import { StateMessage } from "@/components/StateMessage";
import { RoomRow } from "@/components/rows/RoomRow";
import { apiCall, apiFetchPage } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-errors";
import { successHaptic, tapHaptic } from "@/lib/haptics";
import { getAccessToken, readSession } from "@/lib/session";

const RoomsEnvelope = z.object({ data: z.array(ChatRoomSchema) });

export default function MessagesListScreen(): JSX.Element {
  const { t } = useTranslation();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadPromiseRef = useRef<Promise<void> | null>(null);
  const latestLoadRef = useRef<() => Promise<void>>(async () => undefined);

  const load = useCallback(async (): Promise<void> => {
    if (loadPromiseRef.current) return loadPromiseRef.current;

    const run = (async () => {
      const token = await getAccessToken();
      if (!token) return;
      setLoading(true);
      setError(null);
      try {
        const out = await apiFetchPage("/messaging/rooms", RoomsEnvelope, {
          token,
        });
        setRooms(out.data);
      } catch (caught) {
        setError(apiErrorMessage(t, caught));
      } finally {
        setLoading(false);
      }
    })().finally(() => {
      loadPromiseRef.current = null;
    });

    loadPromiseRef.current = run;
    return run;
  }, [t]);

  useEffect(() => {
    latestLoadRef.current = load;
  }, [load]);

  const refresh = useCallback(async (): Promise<void> => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const archiveRoom = useCallback(
    async (roomId: string): Promise<void> => {
      const token = await getAccessToken();
      if (!token) return;
      tapHaptic();
      try {
        await apiCall(`/messaging/rooms/${roomId}/archive`, {
          method: "POST",
          token,
        });
        setRooms((prev) => prev.filter((room) => room.id !== roomId));
        successHaptic();
      } catch (caught) {
        setError(apiErrorMessage(t, caught));
      }
    },
    [t],
  );

  useEffect(() => {
    void (async () => {
      const session = await readSession();
      if (!session) {
        router.replace("/(auth)/login");
        return;
      }
      setViewerId(session.user.id);
    })();
  }, []);

  useFocusEffect(
    useCallback(() => {
      void latestLoadRef.current();
    }, []),
  );

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <AppHeader
          title={t("messaging.title")}
          compact
          trailing={
            <Button
              size="sm"
              leading={<Icon name="message" size={16} color={nativeTokens.color.inkInverse} />}
              onPress={() => router.push("/(app)/messages/new")}
              accessibilityLabel={t("messaging.newGroup.title")}
            >
              {t("messaging.newMessage")}
            </Button>
          }
        />

        <FlatList
          data={rooms}
          keyExtractor={(r) => r.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <RoomRow
              room={item}
              viewerId={viewerId}
              archiveLabel={t("messaging.archive")}
              onArchive={(roomId) => void archiveRoom(roomId)}
            />
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void refresh()}
              tintColor={nativeTokens.color.brand600}
              colors={[nativeTokens.color.brand600]}
            />
          }
          ListEmptyComponent={
            loading ? (
              <View style={styles.skeletonStack}>
                <RecordCardSkeleton />
                <RecordCardSkeleton />
                <RecordCardSkeleton />
              </View>
            ) : error ? (
              <StateMessage
                message={error}
                actionLabel={t("common.retry")}
                busy={loading}
                onAction={() => void load()}
                testID="messages-list-error"
              />
            ) : (
              <StateMessage message={t("messaging.emptyList")} role="text" />
            )
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: nativeTokens.color.surfaceMuted,
  },
  content: {
    flex: 1,
    paddingHorizontal: nativeTokens.space[4],
    paddingTop: nativeTokens.space[3],
  },
  listContent: {
    paddingBottom: nativeTokens.space[6],
  },
  separator: {
    height: nativeTokens.space[2],
  },
  skeletonStack: {
    gap: nativeTokens.space[2],
  },
});
