import { cursorPage, Post as PostSchema, type Post } from "@palnet/shared";
import { router } from "expo-router";
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

import { CommentsList } from "@/components/CommentsList";
import { apiCall, apiFetchPage } from "@/lib/api";
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
        <View className="mb-3 flex-row items-center justify-between">
          <View className="flex-col gap-1">
            <Text className="text-3xl font-bold text-ink">{t("feed.title")}</Text>
            {name ? (
              <Text className="text-ink-muted">
                {t("feed.welcome", { name })}
              </Text>
            ) : null}
          </View>
          <View className="flex-row gap-2">
            <Pressable
              onPress={() => router.push("/(app)/search")}
              className="rounded-md border border-ink-muted/30 px-3 py-1.5"
            >
              <Text className="text-xs text-ink">{t("search.title")}</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push("/(app)/network")}
              className="rounded-md border border-ink-muted/30 px-3 py-1.5"
            >
              <Text className="text-xs text-ink">{t("network.title")}</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push("/(app)/messages")}
              className="rounded-md border border-ink-muted/30 px-3 py-1.5"
            >
              <Text className="text-xs text-ink">{t("messaging.title")}</Text>
            </Pressable>
          </View>
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
          renderItem={({ item }) => (
            <PostRow
              post={item}
              onChange={(next) =>
                setPosts((prev) =>
                  prev.map((x) => (x.id === next.id ? next : x)),
                )
              }
            />
          )}
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

function PostRow({
  post,
  onChange,
}: {
  post: Post;
  onChange?: (next: Post) => void;
}): JSX.Element {
  const { t } = useTranslation();
  const [showComments, setShowComments] = useState(false);
  const [busy, setBusy] = useState(false);

  async function toggleReaction(): Promise<void> {
    if (busy) return;
    const token = await getAccessToken();
    if (!token) return;
    const wasLiked = post.viewer.reaction !== null;
    const optimistic: Post = {
      ...post,
      viewer: { ...post.viewer, reaction: wasLiked ? null : "LIKE" },
      counts: {
        ...post.counts,
        reactions: Math.max(0, post.counts.reactions + (wasLiked ? -1 : 1)),
      },
    };
    onChange?.(optimistic);
    setBusy(true);
    try {
      if (wasLiked) {
        await apiCall(`/posts/${post.id}/reaction`, {
          method: "DELETE",
          token,
        });
      } else {
        await apiCall(`/posts/${post.id}/reaction`, {
          method: "PUT",
          body: { type: "LIKE" },
          token,
        });
      }
    } catch {
      onChange?.(post);
    } finally {
      setBusy(false);
    }
  }

  const liked = post.viewer.reaction !== null;

  return (
    <View className="rounded-md border border-ink-muted/20 bg-white p-4">
      <Pressable onPress={() => router.push(`/(app)/in/${post.author.handle}`)}>
        <Text className="font-semibold text-ink">
          {post.author.firstName} {post.author.lastName}
        </Text>
      </Pressable>
      {post.author.headline ? (
        <Text className="text-sm text-ink-muted">{post.author.headline}</Text>
      ) : null}
      <Text className="mt-2 text-ink">{post.body}</Text>
      {post.media.length > 0 ? (
        <View className="mt-2 flex-row flex-wrap gap-1">
          {post.media.map((m) =>
            m.kind === "IMAGE" ? (
              <Image
                key={m.id ?? m.url}
                source={{ uri: m.url }}
                style={{
                  width: post.media.length === 1 ? "100%" : "49%",
                  height: 180,
                  borderRadius: 6,
                }}
                resizeMode="cover"
              />
            ) : null,
          )}
        </View>
      ) : null}
      <View className="mt-3 flex-row gap-4 border-t border-ink-muted/10 pt-2">
        <Pressable onPress={toggleReaction} disabled={busy}>
          <Text
            className={
              liked
                ? "text-sm font-semibold text-brand-600"
                : "text-sm text-ink-muted"
            }
          >
            {liked ? t("post.liked") : t("post.like")} ({post.counts.reactions})
          </Text>
        </Pressable>
        <Pressable onPress={() => setShowComments((s) => !s)}>
          <Text className="text-sm text-ink-muted">
            {t("post.comments")} ({post.counts.comments})
          </Text>
        </Pressable>
        <Text className="text-sm text-ink-muted">
          {t("post.reposts")}: {post.counts.reposts}
        </Text>
      </View>

      {showComments ? (
        <CommentsList
          postId={post.id}
          onCountChange={(delta) =>
            onChange?.({
              ...post,
              counts: {
                ...post.counts,
                comments: Math.max(0, post.counts.comments + delta),
              },
            })
          }
        />
      ) : null}
    </View>
  );
}
