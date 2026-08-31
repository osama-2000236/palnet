// Messages list — room roster. Uses ui-native Surface + Avatar so rows look
// like the web `/messages` left rail instead of the raw-RN cards.

import { ChatRoom as ChatRoomSchema, type ChatRoom } from "@baydar/shared";
import {
  Alert,
  EmptyState,
  AppBand,
  Button,
  Icon,
  RecordCardSkeleton,
  Tab,
  Tabs,
  nativeTokens,
  useThemeTokens,
  type NativeTheme,
} from "@baydar/ui-native";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, RefreshControl, StatusBar, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { z } from "zod";

import { RoomRow } from "@/components/rows/RoomRow";
import { apiCall, apiFetchPage } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-errors";
import { successHaptic, tapHaptic } from "@/lib/haptics";
import { getAccessToken, readSession } from "@/lib/session";

const RoomsEnvelope = z.object({ data: z.array(ChatRoomSchema) });

export default function MessagesListScreen(): JSX.Element {
  const c = useThemeTokens().color;
  const styles = useStyles();
  const { t } = useTranslation();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadPromiseRef = useRef<Promise<void> | null>(null);
  const latestLoadRef = useRef<() => Promise<void>>(async () => undefined);
  // Message requests: DMs from outside the accepted network get their own tab.
  const [tab, setTab] = useState<"focused" | "requests">("focused");
  const requestCount = rooms.filter((room) => room.isRequest).length;
  const visibleRooms = rooms.filter((room) =>
    tab === "requests" ? room.isRequest : !room.isRequest,
  );

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
    <SafeAreaView edges={["left", "right", "bottom"]} style={styles.screen}>
      <StatusBar barStyle="light-content" />
      <AppBand
        title={t("messaging.title")}
        density="compact"
        trailing={
          <Button
            size="sm"
            leading={<Icon name="message" size={16} color={c.inkInverse} />}
            onPress={() => router.push("/(app)/messages/new")}
            accessibilityLabel={t("messaging.newGroup.title")}
          >
            {t("messaging.newMessage")}
          </Button>
        }
      />
      <View style={styles.content}>
        <Tabs
          testID="messages-tabs"
          style={{ marginBottom: nativeTokens.space[3] }}
          value={tab}
          onChange={(key) => setTab(key as "focused" | "requests")}
        >
          <Tab value="focused">{t("messaging.tabFocused")}</Tab>
          <Tab value="requests">
            {requestCount > 0
              ? `${t("messaging.tabRequests")} (${requestCount})`
              : t("messaging.tabRequests")}
          </Tab>
        </Tabs>

        <FlatList
          testID="room-list"
          data={visibleRooms}
          keyExtractor={(r) => r.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item, index }) => (
            <RoomRow
              room={item}
              viewerId={viewerId}
              archiveLabel={t("messaging.archive")}
              onArchive={(roomId) => void archiveRoom(roomId)}
              testID={`room-list-row-${index}`}
            />
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void refresh()}
              tintColor={c.brand600}
              colors={[c.brand600]}
            />
          }
          ListEmptyComponent={
            loading ? (
              <View style={styles.skeletonStack}>
                <RecordCardSkeleton variant="row" />
                <RecordCardSkeleton variant="row" />
                <RecordCardSkeleton variant="row" />
              </View>
            ) : error ? (
              <Alert
                body={error}
                cta={t("common.retry")}
                busy={loading}
                onAction={() => void load()}
                testID="messages-list-error"
              />
            ) : (
              <EmptyState
                motif="messages"
                title={t(tab === "requests" ? "messaging.emptyRequests" : "messaging.emptyList")}
              />
            )
          }
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={7}
          removeClippedSubviews={true}
        />
      </View>
    </SafeAreaView>
  );
}

function makeStyles(c: NativeTheme["color"]) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: c.surfaceMuted,
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
}

function useStyles() {
  const c = useThemeTokens().color;
  return useMemo(() => makeStyles(c), [c]);
}
