import { type Post } from "@baydar/shared";
import { Avatar, Surface, nativeTokens } from "@baydar/ui-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { memo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { CommentsList } from "@/components/CommentsList";
import { apiCall } from "@/lib/api";
import { successHaptic, tapHaptic } from "@/lib/haptics";
import { getAccessToken } from "@/lib/session";

export interface PostRowProps {
  post: Post;
  onChange?: (next: Post) => void;
}

export const PostRow = memo(function PostRow({ post, onChange }: PostRowProps): JSX.Element {
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

  return (
    <Surface variant="card" padding="4">
      <Pressable
        onPress={() => router.push(`/(app)/in/${post.author.handle}`)}
        style={styles.headerRow}
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
        <View style={styles.headerText}>
          <Text style={styles.name}>
            {post.author.firstName} {post.author.lastName}
          </Text>
          {post.author.headline ? (
            <Text style={styles.muted} numberOfLines={1}>
              {post.author.headline}
            </Text>
          ) : null}
        </View>
      </Pressable>
      <Text style={styles.body}>{post.body}</Text>
      {post.media.length > 0 ? (
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
      ) : null}
      <View style={styles.footer}>
        <Pressable
          onPress={toggleReaction}
          disabled={busy}
          accessibilityRole="button"
          accessibilityState={{ disabled: busy, selected: liked }}
          hitSlop={nativeTokens.space[2]}
          testID={`post-like-${post.id}`}
        >
          <Text style={[styles.muted, liked ? styles.likedLabel : null]}>
            {liked ? t("post.liked") : t("post.like")} ({post.counts.reactions})
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setShowComments((s) => !s)}
          accessibilityRole="button"
          hitSlop={nativeTokens.space[2]}
        >
          <Text style={styles.muted}>
            {t("post.comments")} ({post.counts.comments})
          </Text>
        </Pressable>
        <Text style={styles.muted}>
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
    height: nativeTokens.space[20] * 2 + nativeTokens.space[5],
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
