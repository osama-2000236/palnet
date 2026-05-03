import { formatRelativeTime, type Post } from "@baydar/shared";
import { PostCard, nativeTokens, type PostCardAction } from "@baydar/ui-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { memo, useState } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";

import { CommentsList } from "@/components/CommentsList";
import { apiCall } from "@/lib/api";
import { successHaptic, tapHaptic } from "@/lib/haptics";
import { getAccessToken } from "@/lib/session";

export interface PostRowProps {
  post: Post;
  onChange?: (next: Post) => void;
}

export const PostRow = memo(function PostRow({ post, onChange }: PostRowProps): JSX.Element {
  const { t, i18n } = useTranslation();
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
      tapHaptic();
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
      successHaptic();
    } catch {
      onChange?.(post);
    } finally {
      setBusy(false);
    }
  }

  const liked = post.viewer.reaction !== null;
  const singleMedia = post.media.length === 1;
  const authorName = `${post.author.firstName} ${post.author.lastName}`.trim();
  const media =
    post.media.length > 0 ? (
      <View style={styles.mediaRow}>
        {post.media.map((m) =>
          m.kind === "IMAGE" ? (
            <Image
              key={m.id ?? m.url}
              source={{ uri: m.url }}
              style={[styles.mediaImage, singleMedia ? styles.mediaSingle : styles.mediaPair]}
              contentFit="cover"
              cachePolicy="memory-disk"
              placeholder={m.blurhash ? { blurhash: m.blurhash } : undefined}
            />
          ) : null,
        )}
      </View>
    ) : null;

  const actions: PostCardAction[] = [
    {
      key: "like",
      label: liked ? t("post.liked") : t("post.like"),
      icon: "thumb",
      selected: liked,
      disabled: busy,
      testID: `post-like-${post.id}`,
      onPress: () => void toggleReaction(),
    },
    {
      key: "comment",
      label: t("post.comments"),
      icon: "comment",
      selected: showComments,
      onPress: () => setShowComments((s) => !s),
    },
    {
      key: "repost",
      label: t("post.reposts"),
      icon: "repost",
    },
    {
      key: "send",
      label: t("post.send"),
      icon: "send",
    },
  ];

  return (
    <PostCard
      author={{
        id: post.author.id,
        handle: post.author.handle,
        firstName: post.author.firstName,
        lastName: post.author.lastName,
        avatarUrl: post.author.avatarUrl,
      }}
      authorName={authorName}
      authorHeadline={post.author.headline}
      timestamp={formatRelativeTime(post.createdAt, i18n.language)}
      body={post.body}
      media={media}
      reactionCount={post.counts.reactions}
      commentCount={post.counts.comments}
      repostCount={post.counts.reposts}
      actions={actions}
      onAuthorPress={() => router.push(`/(app)/in/${post.author.handle}`)}
      authorAccessibilityLabel={authorName}
      comments={
        showComments ? (
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
        ) : null
      }
    />
  );
}, areEqual);

function areEqual(prev: PostRowProps, next: PostRowProps): boolean {
  return (
    prev.post.id === next.post.id &&
    prev.post.updatedAt === next.post.updatedAt &&
    prev.post.viewer.reaction === next.post.viewer.reaction &&
    prev.post.counts.reactions === next.post.counts.reactions &&
    prev.post.counts.comments === next.post.counts.comments
  );
}

const styles = StyleSheet.create({
  mediaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: nativeTokens.space[1],
  },
  mediaImage: {
    height: nativeTokens.space[20] * 2 + nativeTokens.space[5],
  },
  mediaSingle: { width: "100%" },
  mediaPair: { width: "49%" },
});
