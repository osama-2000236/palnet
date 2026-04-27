import {
  cursorPage,
  formatRelativeTime,
  Notification as NotificationSchema,
  NotificationType,
  type Notification,
} from "@baydar/shared";
import { Avatar, Icon, Surface, nativeTokens } from "@baydar/ui-native";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { apiCall, apiFetchPage } from "@/lib/api";
import { getAccessToken, readSession } from "@/lib/session";

const NotificationsPage = cursorPage(NotificationSchema);

export default function NotificationsScreen(): JSX.Element {
  const { t } = useTranslation();
  const [items, setItems] = useState<Notification[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);

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

function NotificationRow({ item }: { item: Notification }): JSX.Element {
  const { t, i18n } = useTranslation();
  const actor = item.actor;
  const actorName = actor ? `${actor.firstName} ${actor.lastName}`.trim() || actor.handle : "";
  const body = t(`notifications.templates.${item.type}`, { actor: actorName });
  const unread = item.readAt === null;
  const destination = hrefFor(item);

  const content = (
    <Surface variant="row" padding="4" style={unread ? styles.unreadRow : styles.row}>
      {actor ? (
        <Avatar
          user={{
            id: actor.id,
            handle: actor.handle,
            firstName: actor.firstName,
            lastName: actor.lastName,
            avatarUrl: actor.avatarUrl,
          }}
          size="md"
        />
      ) : (
        <View style={styles.systemIcon}>
          <Icon name="bell" size={nativeTokens.space[5]} color={nativeTokens.color.brand700} />
        </View>
      )}
      <View style={styles.bodyWrap}>
        <Text style={styles.bodyText}>{body}</Text>
        <Text style={styles.timeText}>{formatRelativeTime(item.createdAt, i18n.language)}</Text>
      </View>
      {unread ? <View style={styles.unreadDot} /> : null}
    </Surface>
  );

  if (!destination) return content;
  return (
    <Pressable
      onPress={() => router.push(destination as never)}
      accessibilityRole="link"
      accessibilityLabel={body}
    >
      {content}
    </Pressable>
  );
}

function hrefFor(n: Notification): string | null {
  if (n.type === NotificationType.MESSAGE_RECEIVED) {
    const data = n.data as { roomId?: string } | null;
    if (data?.roomId) return `/(app)/messages/${data.roomId}`;
    return "/(app)/messages";
  }
  if (
    n.type === NotificationType.CONNECTION_REQUEST ||
    n.type === NotificationType.CONNECTION_ACCEPTED
  ) {
    return "/(app)/network";
  }
  if (
    n.type === NotificationType.POST_REACTION ||
    n.type === NotificationType.POST_COMMENT ||
    n.type === NotificationType.POST_MENTION
  ) {
    return "/(app)/feed";
  }
  if (n.type === NotificationType.PROFILE_VIEW && n.actor?.handle) {
    return `/(app)/in/${n.actor.handle}`;
  }
  return null;
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
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: nativeTokens.space[3],
  },
  unreadRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: nativeTokens.space[3],
    backgroundColor: nativeTokens.color.brand50,
  },
  bodyWrap: {
    flex: 1,
    gap: nativeTokens.space[1],
  },
  bodyText: {
    color: nativeTokens.color.ink,
    fontSize: nativeTokens.type.scale.small.size,
    lineHeight: nativeTokens.type.scale.small.line,
    fontFamily: nativeTokens.type.family.sans,
  },
  timeText: {
    color: nativeTokens.color.inkMuted,
    fontSize: nativeTokens.type.scale.caption.size,
    lineHeight: nativeTokens.type.scale.caption.line,
    fontFamily: nativeTokens.type.family.sans,
  },
  unreadDot: {
    width: nativeTokens.space[2],
    height: nativeTokens.space[2],
    borderRadius: nativeTokens.radius.full,
    backgroundColor: nativeTokens.color.accent600,
    marginTop: nativeTokens.space[1],
  },
  systemIcon: {
    width: nativeTokens.space[10],
    height: nativeTokens.space[10],
    borderRadius: nativeTokens.radius.full,
    backgroundColor: nativeTokens.color.brand100,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    color: nativeTokens.color.inkMuted,
    fontSize: nativeTokens.type.scale.body.size,
    lineHeight: nativeTokens.type.scale.body.line,
    fontFamily: nativeTokens.type.family.sans,
  },
});
