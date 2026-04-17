import { cursorPage, Post as PostSchema, type Post } from "@palnet/shared";
import { router } from "expo-router";
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

import { apiFetchPage } from "@/lib/api";
import { getAccessToken, readSession } from "@/lib/session";

const FeedPage = cursorPage(PostSchema);

export default function FeedScreen(): JSX.Element {
  const { t } = useTranslation();
  const [posts, setPosts] = useState<Post[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState<string | null>(null);

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

  useEffect(() => {
    void (async () => {
      const session = await readSession();
      if (!session) {
        router.replace("/(auth)/login");
        return;
      }
      setName(session.user.email.split("@")[0] ?? session.user.email);
      await load(null);
    })();
  }, [load]);

  return (
    <SafeAreaView className="flex-1 bg-surface-muted">
      <View className="flex-1 px-4 pt-8">
        <View className="mb-3 flex-col gap-1">
          <Text className="text-3xl font-bold text-ink">{t("feed.title")}</Text>
          {name ? (
            <Text className="text-ink-muted">
              {t("feed.welcome", { name })}
            </Text>
          ) : null}
        </View>

        <Pressable
          onPress={() => router.push("/(app)/composer")}
          className="mb-3 rounded-md border border-ink-muted/20 bg-white p-4"
        >
          <Text className="text-ink-muted">{t("composer.placeholder")}</Text>
        </Pressable>

        <FlatList
          data={posts}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => <PostRow post={item} />}
          ItemSeparatorComponent={() => <View className="h-3" />}
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (!loading && hasMore && cursor) void load(cursor);
          }}
          ListEmptyComponent={
            loading ? null : (
              <View className="rounded-md border border-ink-muted/20 bg-white p-6">
                <Text className="text-ink-muted">{t("feed.empty")}</Text>
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

function PostRow({ post }: { post: Post }): JSX.Element {
  const { t } = useTranslation();
  return (
    <View className="rounded-md border border-ink-muted/20 bg-white p-4">
      <Text className="font-semibold text-ink">
        {post.author.firstName} {post.author.lastName}
      </Text>
      {post.author.headline ? (
        <Text className="text-sm text-ink-muted">{post.author.headline}</Text>
      ) : null}
      <Text className="mt-2 text-ink">{post.body}</Text>
      <View className="mt-3 flex-row gap-4 border-t border-ink-muted/10 pt-2">
        <Text className="text-sm text-ink-muted">
          {t("post.like")} ({post.counts.reactions})
        </Text>
        <Text className="text-sm text-ink-muted">
          {t("post.comments")}: {post.counts.comments}
        </Text>
        <Text className="text-sm text-ink-muted">
          {t("post.reposts")}: {post.counts.reposts}
        </Text>
      </View>
    </View>
  );
}
