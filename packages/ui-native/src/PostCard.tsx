import { useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Avatar, type AvatarUser } from "./Avatar";
import { Button } from "./Button";
import { Icon } from "./Icon";
import { Image } from "./Image";
import { Surface } from "./Surface";
import { nativeTokens } from "./tokens";

export interface PostCardAuthor extends AvatarUser {
  headline?: string | null;
}

export interface PostCardMedia {
  id?: string | null;
  url: string;
  kind: "IMAGE" | "VIDEO";
  blurhash?: string | null;
}

export interface PostCardCounts {
  reactions: number;
  comments: number;
  reposts: number;
}

export interface PostCardLabels {
  like: string;
  liked: string;
  comment: string;
  repost: string;
  send: string;
  commentsCount(n: number): string;
  repostsCount(n: number): string;
  authorLabel: string;
  moreOptions: string;
  publicAudience: string;
}

export interface PostCardProps {
  id: string;
  author: PostCardAuthor;
  body: string;
  media?: PostCardMedia[];
  timestamp: string;
  counts: PostCardCounts;
  liked: boolean;
  busy?: boolean;
  labels: PostCardLabels;
  onOpenProfile?(authorId: string): void;
  onToggleReaction?(): void;
  onRepost?(): void;
  onShare?(): void;
  commentsSlot?: ReactNode;
  commentsOpen?: boolean;
  onToggleComments?(next: boolean): void;
  moreMenu?: ReactNode;
}

export function PostCard({
  id: _id,
  author,
  body,
  media = [],
  timestamp,
  counts,
  liked,
  busy = false,
  labels,
  onOpenProfile,
  onToggleReaction,
  onRepost,
  onShare,
  commentsSlot,
  commentsOpen,
  onToggleComments,
  moreMenu,
}: PostCardProps): JSX.Element {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = commentsOpen ?? internalOpen;
  const name = `${author.firstName ?? ""} ${author.lastName ?? ""}`.trim() || author.handle || "";

  function toggleComments(): void {
    const next = !open;
    if (onToggleComments) onToggleComments(next);
    else setInternalOpen(next);
  }

  return (
    <Surface variant="card" padding="0" accessibilityRole="summary">
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={labels.authorLabel}
          onPress={() => author.id && onOpenProfile?.(author.id)}
        >
          <Avatar user={author} size="md" />
        </Pressable>
        <View style={styles.authorBlock}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          {author.headline ? (
            <Text style={styles.muted} numberOfLines={1}>
              {author.headline}
            </Text>
          ) : null}
          <Text style={styles.muted}>
            {timestamp} · {labels.publicAudience}
          </Text>
        </View>
        {moreMenu ?? <Icon name="more" size={18} color={nativeTokens.color.inkMuted} />}
      </View>
      {body ? <Text style={styles.body}>{body}</Text> : null}
      {media.map((item, index) =>
        item.kind === "IMAGE" ? (
          <Image
            key={item.id ?? item.url ?? index}
            source={{ uri: item.url }}
            alt=""
            style={styles.image}
          />
        ) : (
          <View key={item.id ?? item.url ?? index} style={styles.video}>
            <Icon name="video" size={28} color={nativeTokens.color.inkMuted} />
          </View>
        ),
      )}
      <View style={styles.stats}>
        <Text style={styles.muted}>{counts.reactions}</Text>
        <Text style={styles.muted}>
          {labels.commentsCount(counts.comments)} · {labels.repostsCount(counts.reposts)}
        </Text>
      </View>
      <View style={styles.actions}>
        <Button variant="ghost" size="sm" disabled={busy} onPress={onToggleReaction}>
          {liked ? labels.liked : labels.like}
        </Button>
        <Button variant="ghost" size="sm" onPress={toggleComments}>
          {labels.comment}
        </Button>
        <Button variant="ghost" size="sm" onPress={onRepost}>
          {labels.repost}
        </Button>
        <Button variant="ghost" size="sm" onPress={onShare}>
          {labels.send}
        </Button>
      </View>
      {open && commentsSlot ? <View style={styles.comments}>{commentsSlot}</View> : null}
    </Surface>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: nativeTokens.space[3],
    padding: nativeTokens.space[4],
  },
  authorBlock: { flex: 1, gap: nativeTokens.space[1] },
  name: {
    color: nativeTokens.color.ink,
    fontFamily: nativeTokens.type.family.sans,
    fontWeight: "700",
  },
  muted: { color: nativeTokens.color.inkMuted, fontSize: nativeTokens.type.scale.small.size },
  body: {
    color: nativeTokens.color.ink,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.body.size,
    lineHeight: 24,
    paddingHorizontal: nativeTokens.space[4],
    paddingBottom: nativeTokens.space[3],
  },
  image: { width: "100%", aspectRatio: 1.6 },
  video: {
    aspectRatio: 1.6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: nativeTokens.color.surfaceSubtle,
  },
  stats: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: nativeTokens.space[3],
    borderBottomWidth: 1,
    borderBottomColor: nativeTokens.color.lineSoft,
  },
  actions: { flexDirection: "row", flexWrap: "wrap", padding: nativeTokens.space[2] },
  comments: {
    borderTopWidth: 1,
    borderTopColor: nativeTokens.color.lineSoft,
    padding: nativeTokens.space[4],
  },
});
