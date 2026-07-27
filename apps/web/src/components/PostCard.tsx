"use client";

// Thin web wrapper around @baydar/ui-web's <PostCard>. The shared component
// owns the visual shell and state machine; this file owns the network (reaction
// API call + optimistic reconcile) and mounts our existing Comments region
// into the shared card via `commentsSlot`.

import {
  Bookmark,
  BookmarkType,
  formatNumber,
  formatRelativeTime,
  type Post,
} from "@baydar/shared";
import {
  Button,
  Dialog,
  PostCard as PostCardShell,
  ReportDialog,
  useToast,
  type ReactionKind,
} from "@baydar/ui-web";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Comments } from "@/components/Comments";
import { apiCall, apiFetch } from "@/lib/api";
import { useReport } from "@/lib/api/safety";
import { getAccessToken, readSession } from "@/lib/session";
import { useReportLabels } from "@/lib/report-labels";

export function PostCard({
  post,
  onChange,
  onDeleted,
}: {
  post: Post;
  onChange?: (next: Post) => void;
  /** Called after the author deletes this post, so the host can drop the row. */
  onDeleted?: (id: string) => void;
}): JSX.Element {
  const t = useTranslations("post");
  const tCommon = useTranslations("common");
  const tSafety = useTranslations("safety");
  const { showToast } = useToast();
  const locale = useLocale();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const report = useReport();
  const [saveBusy, setSaveBusy] = useState(false);
  const [repostBusy, setRepostBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const formatCount = (value: number): string => formatNumber(value, locale);
  // `DELETE /posts/:id` has existed since the posts module was written and no
  // surface on either platform ever called it: an author could publish but
  // never take it back. The overflow menu is where it belongs, and it is the
  // second item that makes the menu a menu rather than a mislabelled button.
  const isAuthor = readSession()?.user.id === post.authorId;

  async function deletePost(): Promise<void> {
    const token = getAccessToken();
    if (!token) return;
    setConfirmDelete(false);
    try {
      await apiCall(`/posts/${post.id}`, { method: "DELETE", token });
      onDeleted?.(post.id);
      showToast({ message: t("deleted"), kind: "success" });
    } catch {
      showToast({ message: t("deleteFailed"), kind: "error" });
    }
  }

  /**
   * `next === null` clears; anything else sets that type. Switching between two
   * types is an update, not a remove-then-add, so the total does not move —
   * which is also exactly what the API's upsert does on the server side.
   */
  async function setReaction(next: ReactionKind | null): Promise<void> {
    const token = getAccessToken();
    if (!token || busy) return;
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
      await apiCall(`/posts/${post.id}/reaction`, {
        method: next === null ? "DELETE" : "PUT",
        body: next === null ? undefined : { type: next },
        token,
      });
    } catch {
      onChange?.(post);
    } finally {
      setBusy(false);
    }
  }

  async function toggleRepost(): Promise<void> {
    const token = getAccessToken();
    if (!token || repostBusy) return;
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
      await apiCall(`/posts/${post.id}/reposts`, {
        method: wasReposted ? "DELETE" : "POST",
        // The endpoint takes an optional quote comment; a plain repost sends none.
        body: wasReposted ? undefined : {},
        token,
      });
    } catch {
      onChange?.(post);
    } finally {
      setRepostBusy(false);
    }
  }

  async function toggleSave(): Promise<void> {
    const token = getAccessToken();
    if (!token || saveBusy) return;
    const bookmarkId = post.viewer.bookmarkId;
    const optimistic: Post = {
      ...post,
      viewer: { ...post.viewer, bookmarkId: bookmarkId ? null : "pending_bookmark" },
    };
    onChange?.(optimistic);
    setSaveBusy(true);
    try {
      if (bookmarkId) {
        await apiCall(`/bookmarks/${bookmarkId}`, { method: "DELETE", token });
        return;
      }
      const created = await apiFetch("/bookmarks", Bookmark, {
        method: "POST",
        token,
        body: { type: BookmarkType.POST, targetId: post.id },
      });
      onChange?.({ ...post, viewer: { ...post.viewer, bookmarkId: created.id } });
    } catch {
      onChange?.(post);
    } finally {
      setSaveBusy(false);
    }
  }
  const reportLabels = useReportLabels();

  return (
    <>
      <PostCardShell
        id={post.id}
        author={{
          id: post.author.id,
          handle: post.author.handle,
          firstName: post.author.firstName,
          lastName: post.author.lastName,
          avatarUrl: post.author.avatarUrl,
          headline: post.author.headline,
        }}
        body={post.body}
        media={post.media.map((m) => ({
          id: m.id ?? m.url,
          url: m.url,
          kind: m.kind === "IMAGE" ? "IMAGE" : "VIDEO",
        }))}
        timestamp={formatRelativeTime(post.createdAt, locale)}
        counts={post.counts}
        reaction={post.viewer.reaction as ReactionKind | null}
        formatCount={formatCount}
        busy={busy}
        reposted={post.viewer.reposted}
        repostBusy={repostBusy}
        saved={post.viewer.bookmarkId !== null}
        saveBusy={saveBusy}
        labels={{
          reactions: {
            pick: t("reactions.pick"),
            kind: {
              LIKE: t("reactions.LIKE"),
              CELEBRATE: t("reactions.CELEBRATE"),
              SUPPORT: t("reactions.SUPPORT"),
              LOVE: t("reactions.LOVE"),
              INSIGHTFUL: t("reactions.INSIGHTFUL"),
              FUNNY: t("reactions.FUNNY"),
            },
          },
          comment: t("comment"),
          repost: t("repost"),
          reposted: t("reposted"),
          save: t("save"),
          saved: t("saved"),
          commentsCount: (count) => t("commentsCount", { count }),
          repostsCount: (count) => t("repostsCount", { count }),
          authorLabel: `${post.author.firstName} ${post.author.lastName}`.trim(),
          moreOptions: t("moreOptions"),
          report: tSafety("report.action"),
          publicAudience: t("publicAudience"),
        }}
        commentsOpen={commentsOpen}
        onToggleComments={setCommentsOpen}
        menuItems={
          isAuthor
            ? [
                {
                  id: "delete",
                  label: t("delete"),
                  icon: "x" as const,
                  destructive: true,
                  onSelect: () => setConfirmDelete(true),
                },
              ]
            : undefined
        }
        onSetReaction={(next) => void setReaction(next)}
        onToggleRepost={() => void toggleRepost()}
        onToggleSave={() => void toggleSave()}
        onReport={() => setReportOpen(true)}
        onOpenProfile={() => router.push(`/in/${post.author.handle}`)}
        commentsSlot={
          <Comments
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
        }
      />
      <Dialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={t("deleteConfirmTitle")}
        description={t("deleteConfirmBody")}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
              {tCommon("cancel")}
            </Button>
            <Button variant="accent" onClick={() => void deletePost()}>
              {t("delete")}
            </Button>
          </>
        }
      >
        {null}
      </Dialog>
      <ReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        target={{ kind: "post", id: post.id }}
        labels={reportLabels}
        submitting={report.isPending}
        onSubmit={(input) => {
          report.mutate(input, {
            onSuccess: () => {
              setReportOpen(false);
              showToast({ message: tSafety("report.success"), kind: "success" });
            },
            onError: () => showToast({ message: tSafety("report.error"), kind: "error" }),
          });
        }}
      />
    </>
  );
}
