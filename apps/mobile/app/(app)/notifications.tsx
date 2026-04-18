import {
  cursorPage,
  Notification as NotificationSchema,
  NotificationType,
  type Notification,
} from "@palnet/shared";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  SafeAreaView,
  Text,
  View,
} from "react-native";

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
      const page = await apiFetchPage(
        `/notifications?${qs.toString()}`,
        NotificationsPage,
        { token },
      );
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
    <SafeAreaView className="flex-1 bg-surface-muted">
      <View className="flex-1 px-4 pt-8">
        <Text className="mb-3 text-3xl font-bold text-ink">
          {t("notifications.title")}
        </Text>

        <FlatList
          data={items}
          keyExtractor={(n) => n.id}
          renderItem={({ item }) => <NotificationRow item={item} />}
          ItemSeparatorComponent={() => <View className="h-2" />}
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (!loading && hasMore && cursor) void load(cursor);
          }}
          ListEmptyComponent={
            loading ? null : (
              <View className="rounded-md border border-ink-muted/20 bg-white p-6">
                <Text className="text-ink-muted">{t("notifications.empty")}</Text>
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

function NotificationRow({ item }: { item: Notification }): JSX.Element {
  const { t } = useTranslation();
  const actor = item.actor;
  const actorName = actor
    ? `${actor.firstName} ${actor.lastName}`.trim() || actor.handle
    : "";
  const body = t(`notifications.templates.${item.type}`, { actor: actorName });
  const unread = item.readAt === null;

  const destination = hrefFor(item);

  const content = (
    <View
      className={`flex-row items-start gap-3 rounded-md border p-3 ${
        unread
          ? "border-brand-500/30 bg-brand-50"
          : "border-ink-muted/20 bg-white"
      }`}
    >
      {actor?.avatarUrl ? (
        <Image
          source={{ uri: actor.avatarUrl }}
          style={{ width: 40, height: 40, borderRadius: 20 }}
        />
      ) : (
        <View className="h-10 w-10 items-center justify-center rounded-full bg-ink-muted/10">
          <Text className="text-sm font-semibold text-ink">
            {initialsOf(actorName) || "?"}
          </Text>
        </View>
      )}
      <View className="flex-1">
        <Text className="text-sm text-ink">{body}</Text>
        <Text className="text-xs text-ink-muted">
          {formatRelative(item.createdAt)}
        </Text>
      </View>
      {unread ? (
        <View className="mt-1 h-2 w-2 rounded-full bg-brand-600" />
      ) : null}
    </View>
  );

  if (!destination) return content;
  return (
    <Pressable onPress={() => router.push(destination as never)}>
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

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "";
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

function formatRelative(iso: string): string {
  try {
    const then = new Date(iso).getTime();
    const now = Date.now();
    const secs = Math.max(0, Math.round((now - then) / 1000));
    if (secs < 60) return `${secs}s`;
    const mins = Math.round(secs / 60);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.round(hrs / 24);
    if (days < 7) return `${days}d`;
    return new Date(iso).toLocaleDateString();
  } catch {
    return "";
  }
}
