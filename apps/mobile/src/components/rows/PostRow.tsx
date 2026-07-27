import {
  Bookmark,
  BookmarkType,
  formatNumber,
  formatRelativeTime,
  type Post,
} from "@baydar/shared";
import {
  PostCard,
  ReactionGlyph,
  topReactions,
  useToast,
  type PostCardAction,
  type ReactionKind,
} from "@baydar/ui-native";
import { router } from "expo-router";
import { memo, useState } from "react";
import { useTranslation } from "react-i18next";

import { CommentsList } from "@/components/CommentsList";
import { PostMedia } from "@/components/rows/PostMedia";
import { PostRowSheets } from "@/components/rows/PostRowSheets";
import { apiCall, apiFetch } from "@/lib/api";
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
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [repostBusy, setRepostBusy] = useState(false);

  /**
   * `next === null` clears; anything else sets that type. Switching between two
   * types is an update, not remove-then-add, so the total does not move — which
   * is what the API's upsert does server-side too.
   */
  async function setReaction(next: ReactionKind | null): Promise<void> {
    if (busy) return;
    const token = await getAccessToken();
    if (!token) return;
    const previous = post.viewer.reaction as ReactionKind | null;
    if (previous === next) return;

    const delta = (previous === null ? 0 : -1) + (next === null ? 0 : 1);
    const byReaction = { ...post.counts.byReaction };
    if (previous) byReaction[previous] = Math.max(0, (byReaction[previous] ?? 1) - 1);
    if (next) byReaction[next] = (byReaction[next] ?? 0) + 1;

    onChange?.({
      ...post,
      viewer: { ...post.viewer, reaction: next },
      counts: {
        ...post.counts,
        reactions: Math.max(0, post.counts.reactions + delta),
        byReaction,
      },
    });
    setBusy(true);
    try {
      tapHaptic();
      await apiCall(`/posts/${post.id}/reaction`, {
        method: next === null ? "DELETE" : "PUT",
        body: next === null ? undefined : { type: next },
        token,
      });
      successHaptic();
    } catch {
      onChange?.(post);
    } finally {
      setBusy(false);
    }
  }

  async function toggleRepost(): Promise<void> {
    if (repostBusy) return;
    const token = await getAccessToken();
    if (!token) return;
    const wasReposted = post.viewer.reposted;
    onChange?.({
      ...post,
      viewer: { ...post.viewer, reposted: !wasReposted },
      counts: {
        ...post.counts,
        reposts: Math.max(0, post.counts.reposts + (wasReposted ? -1 : 1)),
      },
    });
    setRepostBusy(true);
    try {
      tapHaptic();
      await apiCall(`/posts/${post.id}/reposts`, {
        method: wasReposted ? "DELETE" : "POST",
        // The endpoint takes an optional quote comment; a plain repost sends none.
        body: wasReposted ? undefined : {},
        token,
      });
      successHaptic();
    } catch {
      onChange?.(post);
    } finally {
      setRepostBusy(false);
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

  const reaction = post.viewer.reaction as ReactionKind | null;
  const shownReaction: ReactionKind = reaction ?? "LIKE";
  const saved = post.viewer.bookmarkId !== null;
  const reposted = post.viewer.reposted;
  const authorName = `${post.author.firstName} ${post.author.lastName}`.trim();
  const actions: PostCardAction[] = [
    {
      key: "like",
      label: t(`post.reactions.${shownReaction}`),
      icon: "thumb",
      glyph: (
        <ReactionGlyph
          kind={shownReaction}
          size={20}
          tinted={reaction !== null}
          strokeWidth={reaction !== null ? 2.2 : 1.8}
        />
      ),
      selected: reaction !== null,
      disabled: busy,
      testID: `post-like-${post.id}`,
      // Tap toggles; long-press reaches the other five. Web's equivalent is
      // hover-dwell plus focus (ReactionPicker) — same capability, each
      // platform's own gesture.
      accessibilityHint: t("post.reactions.pick"),
      onPress: () => void setReaction(reaction ? null : "LIKE"),
      onLongPress: () => setPickerOpen(true),
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
      label: reposted ? t("post.reposted") : t("post.repost"),
      icon: "repost",
      selected: reposted,
      disabled: repostBusy,
      testID: `post-repost-${post.id}`,
      onPress: () => void toggleRepost(),
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
    // not a peer of like/comment/repost/save. Four actions put the card into
    // PostCard's icon-only mode; the labels survive as accessibilityLabel.
    // No share/send action on either platform: posts have no public permalink,
    // so the button would have nowhere to point.
  ];

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
        media={<PostMedia media={post.media} />}
        reactionCount={
          post.counts.reactions > 0 ? formatNumber(post.counts.reactions, i18n.language) : undefined
        }
        reactionKinds={topReactions(post.counts.byReaction)}
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
      <PostRowSheets
        postId={post.id}
        reaction={reaction}
        pickerOpen={pickerOpen}
        reportOpen={reportOpen}
        onPickerClose={() => setPickerOpen(false)}
        onReportOpenChange={setReportOpen}
        onSetReaction={(next) => void setReaction(next)}
        onReported={() => {
          setReportOpen(false);
          showToast({ message: t("safety.report.success"), kind: "success" });
        }}
        onReportError={() => showToast({ message: t("safety.report.error"), kind: "error" })}
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
    prev.post.viewer.reposted === next.post.viewer.reposted &&
    prev.post.counts.reactions === next.post.counts.reactions &&
    prev.post.counts.comments === next.post.counts.comments &&
    prev.post.counts.reposts === next.post.counts.reposts
  );
}
