import { cursorPage, Post as PostSchema, type Post } from "@baydar/shared";
import { Avatar, PostCardSkeleton, Surface, nativeTokens } from "@baydar/ui-native";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CommentsList } from "@/components/CommentsList";
import { apiCall, apiFetch, apiFetchPage } from "@/lib/api";
import { getAccessToken, readSession } from "@/lib/session";

const FeedPage = cursorPage(PostSchema);
const UnreadCountEnvelope = z.object({ count: z.number().int().nonnegative() });

export default function FeedScreen(): JSX.Element {
  const { t } = useTranslation();
  const [posts, setPosts] = useState<Post[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
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

function PostRow({ post, onChange }: { post: Post; onChange?: (next: Post) => void }): JSX.Element {
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
  const singleMedia = post.media.length === 1;

  return (
    <Surface variant="card" padding="4">
      <Pressable
        onPress={() => router.push(`/(app)/in/${post.author.handle}`)}
        style={postStyles.headerRow}
        accessibilityRole="link"
        accessibilityLabel={`${post.author.firstName} ${post.author.lastName}`}
      >
        <Avatar
          user={{
            id: post.author.id,
            handle: post.author.handle,
            firstName: post.author.firstName,
            lastName: post.author.lastName,
            avatarUrl: post.author.avatarUrl,
          }}
          size="md"
        />
        <View style={postStyles.headerText}>
          <Text style={postStyles.name}>
            {post.author.firstName} {post.author.lastName}
          </Text>
          {post.author.headline ? (
            <Text style={postStyles.muted} numberOfLines={1}>
              {post.author.headline}
            </Text>
          ) : null}
        </View>
      </Pressable>
      <Text style={postStyles.body}>{post.body}</Text>
      {post.media.length > 0 ? (
        <View style={postStyles.mediaRow}>
          {post.media.map((m) =>
            m.kind === "IMAGE" ? (
              <Image
                key={m.id ?? m.url}
                source={{ uri: m.url }}
                style={[
                  postStyles.mediaImage,
                  singleMedia ? postStyles.mediaSingle : postStyles.mediaPair,
                ]}
                resizeMode="cover"
              />
            ) : null,
          )}
        </View>
      ) : null}
      <View style={postStyles.footer}>
        <Pressable
          onPress={toggleReaction}
          disabled={busy}
          accessibilityRole="button"
          accessibilityState={{ disabled: busy, selected: liked }}
          hitSlop={8}
        >
          <Text style={[postStyles.muted, liked ? postStyles.likedLabel : null]}>
            {liked ? t("post.liked") : t("post.like")} ({post.counts.reactions})
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setShowComments((s) => !s)}
          accessibilityRole="button"
          hitSlop={8}
        >
          <Text style={postStyles.muted}>
            {t("post.comments")} ({post.counts.comments})
          </Text>
        </Pressable>
        <Text style={postStyles.muted}>
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
    </Surface>
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

const postStyles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: nativeTokens.space[3],
  },
  headerText: { flex: 1 },
  name: {
    color: nativeTokens.color.ink,
    fontSize: nativeTokens.type.scale.h3.size,
    lineHeight: nativeTokens.type.scale.h3.line,
    fontWeight: "600",
    fontFamily: nativeTokens.type.family.sans,
  },
  muted: {
    color: nativeTokens.color.inkMuted,
    fontSize: nativeTokens.type.scale.small.size,
    lineHeight: nativeTokens.type.scale.small.line,
    fontFamily: nativeTokens.type.family.sans,
  },
  body: {
    color: nativeTokens.color.ink,
    fontSize: nativeTokens.type.scale.body.size,
    lineHeight: nativeTokens.type.scale.body.line,
    fontFamily: nativeTokens.type.family.body,
    marginTop: nativeTokens.space[2],
  },
  mediaRow: {
    marginTop: nativeTokens.space[2],
    flexDirection: "row",
    flexWrap: "wrap",
    gap: nativeTokens.space[1],
  },
  mediaImage: {
    height: 180,
    borderRadius: nativeTokens.radius.sm,
  },
  mediaSingle: { width: "100%" },
  mediaPair: { width: "49%" },
  footer: {
    marginTop: nativeTokens.space[3],
    paddingTop: nativeTokens.space[2],
    borderTopWidth: 1,
    borderTopColor: nativeTokens.color.lineSoft,
    flexDirection: "row",
    gap: nativeTokens.space[4],
  },
  likedLabel: {
    color: nativeTokens.color.brand700,
    fontWeight: "600",
  },
});
