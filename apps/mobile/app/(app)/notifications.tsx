import { cursorPage, Notification as NotificationSchema, type Notification } from "@baydar/shared";
import { Surface, nativeTokens } from "@baydar/ui-native";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { NotificationRow } from "@/components/rows/NotificationRow";
import { apiCall, apiFetchPage } from "@/lib/api";
import { getAccessToken, readSession } from "@/lib/session";

const NotificationsPage = cursorPage(NotificationSchema);

export default function NotificationsScreen(): JSX.Element {
  const { t } = useTranslation();
  const [items, setItems] = useState<Notification[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (after: string | null): Promise<void> => {
    const token = await getAccessToken();
    if (!token) return;
    setLoading(true);
    try {
      const qs = new URLSearchParams({ limit: "30" });
      if (after) qs.set("after", after);
      const page = await apiFetchPage(`/notifications?${qs.toString()}`, NotificationsPage, {
        token,
      });
      setItems((prev) => (after ? [...prev, ...page.data] : page.data));
      setCursor(page.meta.nextCursor);
      setHasMore(page.meta.hasMore);
    } finally {
      setLoading(false);
    }
  }, []);

  const markAllRead = useCallback(async (): Promise<void> => {
    const token = await getAccessToken();
    if (!token) return;
    await apiCall("/notifications/read", {
      method: "POST",
      token,
      body: { all: true },
    }).catch(() => {});
  }, []);

  const refreshNotifications = useCallback(async (): Promise<void> => {
    setRefreshing(true);
    try {
      await load(null);
      await markAllRead();
    } finally {
      setRefreshing(false);
    }
  }, [load, markAllRead]);

  useEffect(() => {
    void (async () => {
      const session = await readSession();
      if (!session) {
        router.replace("/(auth)/login");
        return;
      }
      await load(null);
      await markAllRead();
    })();
  }, [load, markAllRead]);

  // Poll on focus — SSE is web-only; mobile catches up when the tab reopens.
  useFocusEffect(
    useCallback(() => {
      void (async () => {
        await load(null);
        await markAllRead();
      })();
    }, [load, markAllRead]),
  );

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <Text style={styles.title}>{t("notifications.title")}</Text>

        <FlatList
          data={items}
          keyExtractor={(n) => n.id}
          renderItem={({ item }) => <NotificationRow item={item} />}
          contentContainerStyle={styles.listContent}
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (!loading && hasMore && cursor) void load(cursor);
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void refreshNotifications()}
              tintColor={nativeTokens.color.brand600}
              colors={[nativeTokens.color.brand600]}
            />
          }
          ListEmptyComponent={
            loading ? null : (
              <Surface variant="tinted" padding="6">
                <Text style={styles.emptyText}>{t("notifications.empty")}</Text>
              </Surface>
            )
          }
          ListFooterComponent={
            loading ? (
              <View style={styles.loading}>
                <ActivityIndicator />
              </View>
            ) : null
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
    paddingTop: nativeTokens.space[8],
  },
  title: {
    color: nativeTokens.color.ink,
    fontSize: nativeTokens.type.scale.display.size,
    lineHeight: nativeTokens.type.scale.display.line,
    fontWeight: "700",
    fontFamily: nativeTokens.type.family.sans,
    marginBottom: nativeTokens.space[3],
  },
  listContent: {
    paddingBottom: nativeTokens.space[6],
  },
  loading: {
    paddingVertical: nativeTokens.space[4],
  },
  emptyText: {
    color: nativeTokens.color.inkMuted,
    fontSize: nativeTokens.type.scale.body.size,
    lineHeight: nativeTokens.type.scale.body.line,
    fontFamily: nativeTokens.type.family.sans,
  },
});
