import { cursorPage, Post as PostSchema, type Post } from "@baydar/shared";
import { PostCardSkeleton, Surface, nativeTokens } from "@baydar/ui-native";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PostRow } from "@/components/rows/PostRow";
import { apiFetch, apiFetchPage } from "@/lib/api";
import { track } from "@/lib/analytics";
import { getAccessToken, readSession } from "@/lib/session";

const FeedPage = cursorPage(PostSchema);
const UnreadCountEnvelope = z.object({ count: z.number().int().nonnegative() });

export default function FeedScreen(): JSX.Element {
  const { t } = useTranslation();
  const [posts, setPosts] = useState<Post[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [name, setName] = useState<string | null>(null);
  const [unread, setUnread] = useState<number>(0);

  const loadUnread = useCallback(async (): Promise<void> => {
    const token = await getAccessToken();
    if (!token) return;
    try {
      const out = await apiFetch("/notifications/unread-count", UnreadCountEnvelope, { token });
      setUnread(out.count);
    } catch {
      /* ignore */
    }
  }, []);

  const load = useCallback(async (after: string | null): Promise<void> => {
    const token = await getAccessToken();
    if (!token) return;
    setLoading(true);
    try {
      const qs = new URLSearchParams({ limit: "20" });
      if (after) qs.set("after", after);
      const page = await apiFetchPage(`/feed?${qs.toString()}`, FeedPage, {
        token,
      });
      setPosts((prev) => (after ? [...prev, ...page.data] : page.data));
      setCursor(page.meta.nextCursor);
      setHasMore(page.meta.hasMore);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshFeed = useCallback(async (): Promise<void> => {
    setRefreshing(true);
    try {
      await Promise.all([load(null), loadUnread()]);
      track("feed.refresh");
    } finally {
      setRefreshing(false);
    }
  }, [load, loadUnread]);

  useEffect(() => {
    void (async () => {
      const session = await readSession();
      if (!session) {
        router.replace("/(auth)/login");
        return;
      }
      setName(session.user.email.split("@")[0] ?? session.user.email);
      await load(null);
      await loadUnread();
    })();
  }, [load, loadUnread]);

  useFocusEffect(
    useCallback(() => {
      void loadUnread();
    }, [loadUnread]),
  );

  return (
    <SafeAreaView style={feedStyles.screen}>
      <View style={feedStyles.content}>
        <View style={feedStyles.header}>
          <Text style={feedStyles.title}>{t("feed.title")}</Text>
          {name ? <Text style={feedStyles.welcome}>{t("feed.welcome", { name })}</Text> : null}
          {unread > 0 ? (
            <Text
              style={feedStyles.unreadBadge}
              accessibilityLabel={t("nav.unreadNotifications", { count: unread })}
            >
              {unread > 99 ? "99+" : String(unread)}
            </Text>
          ) : null}
        </View>

        <Pressable
          onPress={() => router.push("/(app)/composer")}
          style={feedStyles.composerWrap}
          accessibilityRole="button"
          accessibilityLabel={t("composer.placeholder")}
        >
          <Surface variant="card" padding="4">
            <Text style={feedStyles.composerPlaceholder}>{t("composer.placeholder")}</Text>
          </Surface>
        </Pressable>

        <FlatList
          data={posts}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => (
            <PostRow
              post={item}
              onChange={(next) =>
                setPosts((prev) => prev.map((x) => (x.id === next.id ? next : x)))
              }
            />
          )}
          ItemSeparatorComponent={() => <View style={feedStyles.separator} />}
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (!loading && hasMore && cursor) void load(cursor);
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void refreshFeed()}
              tintColor={nativeTokens.color.brand600}
              colors={[nativeTokens.color.brand600]}
            />
          }
          ListEmptyComponent={
            loading ? (
              <View style={feedStyles.skeletonStack}>
                <PostCardSkeleton />
                <PostCardSkeleton />
                <PostCardSkeleton />
              </View>
            ) : (
              <Surface variant="tinted" padding="6">
                <Text style={feedStyles.emptyText}>{t("feed.empty")}</Text>
              </Surface>
            )
          }
          ListFooterComponent={
            loading ? (
              <View style={feedStyles.footerLoading}>
                <ActivityIndicator />
              </View>
            ) : null
          }
        />
      </View>
    </SafeAreaView>
  );
}

const feedStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: nativeTokens.color.surfaceMuted,
  },
  content: {
    flex: 1,
    paddingHorizontal: nativeTokens.space[4],
    paddingTop: nativeTokens.space[6],
  },
  header: {
    marginBottom: nativeTokens.space[3],
    gap: nativeTokens.space[1],
  },
  title: {
    fontSize: nativeTokens.type.scale.display.size,
    lineHeight: nativeTokens.type.scale.display.line,
    fontWeight: "700",
    color: nativeTokens.color.ink,
    fontFamily: nativeTokens.type.family.sans,
  },
  welcome: {
    color: nativeTokens.color.inkMuted,
    fontSize: nativeTokens.type.scale.small.size,
    lineHeight: nativeTokens.type.scale.small.line,
    fontFamily: nativeTokens.type.family.sans,
  },
  unreadBadge: {
    marginTop: nativeTokens.space[1],
    alignSelf: "flex-start",
    backgroundColor: nativeTokens.color.accent600,
    color: nativeTokens.color.inkInverse,
    fontSize: 11,
    fontWeight: "700",
    paddingHorizontal: nativeTokens.space[2],
    paddingVertical: 2,
    borderRadius: nativeTokens.radius.full,
    fontFamily: nativeTokens.type.family.sans,
  },
  composerWrap: { marginBottom: nativeTokens.space[3] },
  composerPlaceholder: {
    color: nativeTokens.color.inkMuted,
    fontSize: nativeTokens.type.scale.body.size,
    fontFamily: nativeTokens.type.family.sans,
  },
  emptyText: {
    color: nativeTokens.color.inkMuted,
    fontSize: nativeTokens.type.scale.body.size,
    fontFamily: nativeTokens.type.family.sans,
  },
  skeletonStack: {
    gap: nativeTokens.space[3],
  },
  separator: {
    height: nativeTokens.space[3],
  },
  footerLoading: {
    paddingVertical: nativeTokens.space[4],
  },
});
