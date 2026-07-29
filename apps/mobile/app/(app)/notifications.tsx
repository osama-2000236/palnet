import { cursorPage, Notification as NotificationSchema, type Notification } from "@baydar/shared";
import {
  EmptyState,
  AppHeader,
  Icon,
  RecordCardSkeleton,
  nativeTokens,
  useToast,
  useThemeTokens,
  type NativeTheme,
} from "@baydar/ui-native";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, I18nManager, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";

import { useDismissNotification } from "@/api/notifications";
import { StateMessage } from "@/components/StateMessage";
import { NotificationRow } from "@/components/rows/NotificationRow";
import { apiCall, apiFetchPage } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-errors";
import { getAccessToken, readSession } from "@/lib/session";

const NotificationsPage = cursorPage(NotificationSchema);

export default function NotificationsScreen(): JSX.Element {
  const c = useThemeTokens().color;
  const styles = useStyles();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { mutate: dismissNotification } = useDismissNotification();
  const [items, setItems] = useState<Notification[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadPromiseRef = useRef<Promise<void> | null>(null);
  const latestInitialLoadRef = useRef<() => Promise<void>>(async () => undefined);

  const load = useCallback(
    async (after: string | null): Promise<void> => {
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
    },
    [t],
  );

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

  const dismissItem = useCallback(
    (item: Notification): void => {
      setItems((prev) => prev.filter((next) => next.id !== item.id));
      dismissNotification(item.id, {
        onSuccess: () => {
          showToast({ message: t("notifications.dismiss.success"), kind: "success" });
        },
        onError: () => {
          setItems((prev) => restoreNotification(prev, item));
          showToast({ message: t("notifications.dismiss.error"), kind: "error" });
        },
      });
    },
    [dismissNotification, showToast, t],
  );

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
          renderItem={({ item }) => (
            <DismissibleNotificationRow item={item} onDismiss={dismissItem} />
          )}
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
              <StateMessage
                message={error}
                actionLabel={t("common.retry")}
                busy={loading}
                onAction={() => void load(null)}
              />
            ) : (
              <EmptyState motif="notifications" title={t("notifications.empty")} />
            )
          }
        />
      </View>
    </SafeAreaView>
  );
}

function DismissibleNotificationRow({
  item,
  onDismiss,
}: {
  item: Notification;
  onDismiss(item: Notification): void;
}): JSX.Element {
  const c = useThemeTokens().color;
  const styles = useStyles();
  const { t } = useTranslation();
  const renderDismissAction = useCallback(
    () => (
      <View style={styles.dismissAction}>
        <Icon name="x" size={nativeTokens.space[5]} color={c.inkInverse} />
        <Text style={styles.dismissActionText}>{t("notifications.dismiss.action")}</Text>
      </View>
    ),
    [c.inkInverse, styles.dismissAction, styles.dismissActionText, t],
  );

  return (
    <Swipeable
      overshootLeft={false}
      overshootRight={false}
      renderLeftActions={I18nManager.isRTL ? renderDismissAction : undefined}
      renderRightActions={I18nManager.isRTL ? undefined : renderDismissAction}
      onSwipeableOpen={() => onDismiss(item)}
    >
      <NotificationRow item={item} />
    </Swipeable>
  );
}

function restoreNotification(items: Notification[], item: Notification): Notification[] {
  if (items.some((next) => next.id === item.id)) return items;
  return [...items, item].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
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
    dismissAction: {
      minWidth: nativeTokens.space[24],
      borderRadius: nativeTokens.radius.md,
      backgroundColor: c.danger,
      alignItems: "center",
      justifyContent: "center",
      gap: nativeTokens.space[1],
      paddingHorizontal: nativeTokens.space[3],
    },
    dismissActionText: {
      color: c.inkInverse,
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.caption.size,
      lineHeight: nativeTokens.type.scale.caption.line,
      fontWeight: "700",
      textAlign: "center",
    },
  });
}

function useStyles() {
  const c = useThemeTokens().color;
  return useMemo(() => makeStyles(c), [c]);
}
