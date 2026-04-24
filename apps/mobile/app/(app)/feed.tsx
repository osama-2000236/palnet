import { cursorPage, Post as PostSchema, type Post } from "@palnet/shared";
import { Avatar, Button, Icon, Surface, nativeTokens } from "@palnet/ui-native";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { z } from "zod";
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
import { PostActions } from "@/components/PostActions";
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
      const out = await apiFetch(
        "/notifications/unread-count",
        UnreadCountEnvelope,
        { token },
      );
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
    <SafeAreaView className="flex-1 bg-surface-muted" testID="screen-feed">
      <View className="flex-1 px-4 pt-6">
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            justifyContent: "space-between",
          }}
        >
        <View className="mb-3 flex-col gap-0.5" style={{ flex: 1 }}>
          <Text
            testID="feed-title"
            style={{
              fontSize: nativeTokens.type.scale.display.size,
              lineHeight: nativeTokens.type.scale.display.line,
              fontWeight: "700",
              color: nativeTokens.color.ink,
              fontFamily: nativeTokens.type.family.sans,
            }}
          >
            {t("feed.title")}
          </Text>
          {name ? (
            <Text
              style={{
                color: nativeTokens.color.inkMuted,
                fontSize: nativeTokens.type.scale.small.size,
                lineHeight: nativeTokens.type.scale.small.line,
                fontFamily: nativeTokens.type.family.sans,
              }}
            >
              {t("feed.welcome", { name })}
            </Text>
          ) : null}
          {unread > 0 ? (
            <Text
              style={{
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
              }}
              accessibilityLabel={t("nav.unreadNotifications", { count: unread })}
            >
              {unread > 99 ? "99+" : String(unread)}
            </Text>
          ) : null}
        </View>
        <Pressable
          testID="feed-search"
          accessibilityRole="button"
          accessibilityLabel={t("search.title")}
          onPress={() => router.push("/(app)/search" as never)}
          hitSlop={8}
          style={{
            padding: nativeTokens.space[2],
            marginTop: -nativeTokens.space[1],
          }}
        >
          <Icon name="search" color={nativeTokens.color.inkMuted} size={22} />
        </Pressable>
        </View>

        <Pressable
          onPress={() => router.push("/(app)/composer")}
          style={{ marginBottom: nativeTokens.space[3] }}
          accessibilityRole="button"
          accessibilityLabel={t("composer.placeholder")}
          testID="feed-composer"
        >
          <Surface variant="card" padding="4">
            <Text
              style={{
                color: nativeTokens.color.inkMuted,
                fontSize: nativeTokens.type.scale.body.size,
                fontFamily: nativeTokens.type.family.sans,
              }}
            >
              {t("composer.placeholder")}
            </Text>
          </Surface>
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
              onHide={() =>
                setPosts((prev) =>
                  prev.filter((x) => x.author.id !== item.author.id),
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
              <Surface variant="tinted" padding="6">
                <Text
                  style={{
                    color: nativeTokens.color.inkMuted,
                    fontSize: nativeTokens.type.scale.body.size,
                    fontFamily: nativeTokens.type.family.sans,
                  }}
                >
                  {t("feed.empty")}
                </Text>
              </Surface>
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
  onHide,
}: {
  post: Post;
  onChange?: (next: Post) => void;
  onHide?: () => void;
}): JSX.Element {
  const { t } = useTranslation();
  const [showComments, setShowComments] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);

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
  const nameStyle = {
    color: nativeTokens.color.ink,
    fontSize: nativeTokens.type.scale.h3.size,
    lineHeight: nativeTokens.type.scale.h3.line,
    fontWeight: "600" as const,
    fontFamily: nativeTokens.type.family.sans,
  };
  const mutedStyle = {
    color: nativeTokens.color.inkMuted,
    fontSize: nativeTokens.type.scale.small.size,
    lineHeight: nativeTokens.type.scale.small.line,
    fontFamily: nativeTokens.type.family.sans,
  };
  const bodyStyle = {
    color: nativeTokens.color.ink,
    fontSize: nativeTokens.type.scale.body.size,
    lineHeight: nativeTokens.type.scale.body.line,
    fontFamily: nativeTokens.type.family.body,
    marginTop: nativeTokens.space[2],
  };

  const authorName =
    `${post.author.firstName} ${post.author.lastName}`.trim() ||
    post.author.handle;

  return (
    <Surface variant="card" padding="4">
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: nativeTokens.space[2],
        }}
      >
        <Pressable
          onPress={() => router.push(`/(app)/in/${post.author.handle}`)}
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            gap: nativeTokens.space[3],
          }}
          accessibilityRole="link"
          accessibilityLabel={authorName}
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
          <View style={{ flex: 1 }}>
            <Text style={nameStyle}>
              {post.author.firstName} {post.author.lastName}
            </Text>
            {post.author.headline ? (
              <Text style={mutedStyle} numberOfLines={1}>
                {post.author.headline}
              </Text>
            ) : null}
          </View>
        </Pressable>
        <Pressable
          onPress={() => setActionsOpen(true)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t("moderation.more")}
          testID={`post-more-${post.id}`}
          style={{
            width: 32,
            height: 32,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: nativeTokens.radius.full,
          }}
        >
          <Icon name="more" size={18} color={nativeTokens.color.inkMuted} />
        </Pressable>
      </View>
      <Text style={bodyStyle}>{post.body}</Text>
      {post.media.length > 0 ? (
        <View
          style={{
            marginTop: nativeTokens.space[2],
            flexDirection: "row",
            flexWrap: "wrap",
            gap: nativeTokens.space[1],
          }}
        >
          {post.media.map((m) =>
            m.kind === "IMAGE" ? (
              <Image
                key={m.id ?? m.url}
                source={{ uri: m.url }}
                style={{
                  width: post.media.length === 1 ? "100%" : "49%",
                  height: 180,
                  borderRadius: nativeTokens.radius.sm,
                }}
                resizeMode="cover"
              />
            ) : null,
          )}
        </View>
      ) : null}
      <View
        style={{
          marginTop: nativeTokens.space[3],
          paddingTop: nativeTokens.space[2],
          borderTopWidth: 1,
          borderTopColor: nativeTokens.color.lineSoft,
          flexDirection: "row",
          gap: nativeTokens.space[4],
        }}
      >
        <Pressable
          onPress={toggleReaction}
          disabled={busy}
          accessibilityRole="button"
          accessibilityState={{ disabled: busy, selected: liked }}
          hitSlop={8}
        >
          <Text
            style={[
              mutedStyle,
              liked && {
                color: nativeTokens.color.brand700,
                fontWeight: "600",
              },
            ]}
          >
            {liked ? t("post.liked") : t("post.like")} ({post.counts.reactions})
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setShowComments((s) => !s)}
          accessibilityRole="button"
          hitSlop={8}
        >
          <Text style={mutedStyle}>
            {t("post.comments")} ({post.counts.comments})
          </Text>
        </Pressable>
        <Text style={mutedStyle}>
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

      <PostActions
        open={actionsOpen}
        onClose={() => setActionsOpen(false)}
        authorId={post.author.id}
        authorName={authorName}
        targetKind="POST"
        targetId={post.id}
        onHide={onHide}
      />
    </Surface>
  );
}
