import {
  Bookmark,
  BookmarkType,
  ReportReason,
  formatNumber,
  formatRelativeTime,
  type Post,
} from "@baydar/shared";
import {
  PostCard,
  ReportSheet,
  nativeTokens,
  useToast,
  type PostCardAction,
  type ReportSheetLabels,
} from "@baydar/ui-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { memo, useState } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";

import { CommentsList } from "@/components/CommentsList";
import { apiCall, apiFetch } from "@/lib/api";
import { useReport } from "@/api/safety";
import { successHaptic, tapHaptic } from "@/lib/haptics";
import { getAccessToken } from "@/lib/session";

export interface PostRowProps {
  post: Post;
  onChange?: (next: Post) => void;
}

export const PostRow = memo(function PostRow({ post, onChange }: PostRowProps): JSX.Element {
  const { t, i18n } = useTranslation();
  const { showToast } = useToast();
  const [showComments, setShowComments] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const report = useReport();

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

  async function toggleSave(): Promise<void> {
    if (saveBusy) return;
    const token = await getAccessToken();
    if (!token) return;
    const bookmarkId = post.viewer.bookmarkId;
    const optimistic: Post = {
      ...post,
      viewer: { ...post.viewer, bookmarkId: bookmarkId ? null : "pending_bookmark" },
    };
    onChange?.(optimistic);
    setSaveBusy(true);
    try {
      tapHaptic();
      if (bookmarkId) {
        await apiCall(`/bookmarks/${bookmarkId}`, { method: "DELETE", token });
        successHaptic();
        return;
      }
      const created = await apiFetch("/bookmarks", Bookmark, {
        method: "POST",
        token,
        body: { type: BookmarkType.POST, targetId: post.id },
      });
      onChange?.({ ...post, viewer: { ...post.viewer, bookmarkId: created.id } });
      successHaptic();
    } catch {
      onChange?.(post);
    } finally {
      setSaveBusy(false);
    }
  }

  const liked = post.viewer.reaction !== null;
  const saved = post.viewer.bookmarkId !== null;
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
      key: "save",
      label: saved ? t("post.saved") : t("post.save"),
      icon: "bookmark",
      selected: saved,
      disabled: saveBusy,
      testID: `post-save-${post.id}`,
      onPress: () => void toggleSave(),
    },
    // Report lives on the header overflow button, not the action bar — it is
    // not a peer of like/comment/save, and 4 buttons truncate their labels.
  ];

  const reportLabels: ReportSheetLabels = {
    title: t("safety.report.title"),
    detailsLabel: t("safety.report.details_label"),
    cancel: t("common.cancel"),
    submit: t("safety.report.submit"),
    close: t("safety.report.close"),
    reasons: {
      [ReportReason.SPAM]: t("safety.report.reason.spam"),
      [ReportReason.HARASSMENT]: t("safety.report.reason.harassment"),
      [ReportReason.HATE]: t("safety.report.reason.hate"),
      [ReportReason.MISINFORMATION]: t("safety.report.reason.misinformation"),
      [ReportReason.NUDITY]: t("safety.report.reason.nudity"),
      [ReportReason.VIOLENCE]: t("safety.report.reason.violence"),
      [ReportReason.OTHER]: t("safety.report.reason.other"),
    },
  };

  return (
    <>
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
        reactionCount={
          post.counts.reactions > 0 ? formatNumber(post.counts.reactions, i18n.language) : undefined
        }
        commentCount={
          post.counts.comments > 0 ? formatNumber(post.counts.comments, i18n.language) : undefined
        }
        repostCount={
          post.counts.reposts > 0 ? formatNumber(post.counts.reposts, i18n.language) : undefined
        }
        actions={actions}
        onAuthorPress={() => router.push(`/(app)/in/${post.author.handle}`)}
        authorAccessibilityLabel={authorName}
        onMorePress={() => setReportOpen(true)}
        moreAccessibilityLabel={t("safety.report.action")}
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
      <ReportSheet
        open={reportOpen}
        onOpenChange={setReportOpen}
        target={{ kind: "post", id: post.id }}
        labels={reportLabels}
        submitting={report.isPending}
        onSubmit={(input) => {
          report.mutate(input, {
            onSuccess: () => {
              setReportOpen(false);
              showToast({ message: t("safety.report.success"), kind: "success" });
            },
            onError: () => {
              showToast({ message: t("safety.report.error"), kind: "error" });
            },
          });
        }}
      />
    </>
  );
}, areEqual);

function areEqual(prev: PostRowProps, next: PostRowProps): boolean {
  return (
    prev.post.id === next.post.id &&
    prev.post.updatedAt === next.post.updatedAt &&
    prev.post.viewer.reaction === next.post.viewer.reaction &&
    prev.post.viewer.bookmarkId === next.post.viewer.bookmarkId &&
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
