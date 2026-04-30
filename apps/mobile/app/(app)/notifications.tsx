import { cursorPage, Notification as NotificationSchema, type Notification } from "@baydar/shared";
import { AppHeader, nativeTokens } from "@baydar/ui-native";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { StateMessage } from "@/components/StateMessage";
import { NotificationRow } from "@/components/rows/NotificationRow";
import { apiCall, apiFetchPage } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-errors";
import { getAccessToken, readSession } from "@/lib/session";

const NotificationsPage = cursorPage(NotificationSchema);

export default function NotificationsScreen(): JSX.Element {
  const { t } = useTranslation();
  const [items, setItems] = useState<Notification[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadPromiseRef = useRef<Promise<void> | null>(null);
  const latestInitialLoadRef = useRef<() => Promise<void>>(async () => undefined);

  const load = useCallback(async (after: string | null): Promise<void> => {
    if (!after && loadPromiseRef.current) return loadPromiseRef.current;

    const run = (async () => {
      const token = await getAccessToken();
      if (!token) return;
      setLoading(true);
      if (!after) setError(null);
      try {
        const qs = new URLSearchParams({ limit: "30" });
        if (after) qs.set("after", after);
        const page = await apiFetchPage(`/notifications?${qs.toString()}`, NotificationsPage, {
          token,
        });
        setItems((prev) => (after ? [...prev, ...page.data] : page.data));
        setCursor(page.meta.nextCursor);
        setHasMore(page.meta.hasMore);
      } catch (caught) {
        if (!after) setError(apiErrorMessage(t, caught));
      } finally {
        setLoading(false);
      }
    })().finally(() => {
      if (!after) loadPromiseRef.current = null;
    });

    if (!after) loadPromiseRef.current = run;
    return run;
  }, [t]);

  const markAllRead = useCallback(async (): Promise<void> => {
    const token = await getAccessToken();
    if (!token) return;
    await apiCall("/notifications/read", {
      method: "POST",
      token,
      body: { all: true },
    }).catch(() => {});
  }, []);

  useEffect(() => {
    latestInitialLoadRef.current = async () => {
      await load(null);
      await markAllRead();
    };
  }, [load, markAllRead]);

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
    })();
  }, []);

  // Poll on focus — SSE is web-only; mobile catches up when the tab reopens.
  useFocusEffect(
    useCallback(() => {
      void latestInitialLoadRef.current();
    }, []),
  );

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <AppHeader title={t("notifications.title")} compact />

        <FlatList
          data={items}
          keyExtractor={(n) => n.id}
          renderItem={({ item }) => <NotificationRow item={item} />}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
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
            loading ? null : error ? (
              <StateMessage
                message={error}
                actionLabel={t("common.retry")}
                busy={loading}
                onAction={() => void load(null)}
              />
            ) : (
              <StateMessage message={t("notifications.empty")} role="text" />
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
    paddingTop: nativeTokens.space[3],
  },
  listContent: {
    paddingBottom: nativeTokens.space[6],
  },
  loading: {
    paddingVertical: nativeTokens.space[4],
  },
  separator: {
    height: nativeTokens.space[2],
  },
  emptyText: {
    color: nativeTokens.color.inkMuted,
    fontSize: nativeTokens.type.scale.body.size,
    lineHeight: nativeTokens.type.scale.body.line,
    fontFamily: nativeTokens.type.family.sans,
  },
});
