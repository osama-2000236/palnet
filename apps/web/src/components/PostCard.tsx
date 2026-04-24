"use client";

// Thin web wrapper around @palnet/ui-web's <PostCard>. The shared component
// owns the visual shell and state machine; this file owns the network (reaction
// API call + optimistic reconcile) and mounts our existing Comments region
// into the shared card via `commentsSlot`.

import { formatRelativeTime, type Post } from "@palnet/shared";
import { PostCard as PostCardShell } from "@palnet/ui-web";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Comments } from "@/components/Comments";
import { MoreMenu } from "@/components/MoreMenu";
import { ReportDialog } from "@/components/ReportDialog";
import { apiCall } from "@/lib/api";
import { getAccessToken } from "@/lib/session";

export function PostCard({
  post,
  onChange,
  onHide,
}: {
  post: Post;
  onChange?: (next: Post) => void;
  /**
   * Fired after a successful block — host usually drops the post from its
   * list because the backend will stop returning content from this author
   * on the next fetch anyway.
   */
  onHide?: () => void;
}): JSX.Element {
  const t = useTranslations("post");
  const tMod = useTranslations("moderation");
  const locale = useLocale();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const authorName =
    `${post.author.firstName} ${post.author.lastName}`.trim() ||
    post.author.handle;

  async function toggleReaction(): Promise<void> {
    const token = getAccessToken();
    if (!token || busy) return;
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

  async function blockAuthor(): Promise<void> {
    const token = getAccessToken();
    if (!token) return;
    const ok = window.confirm(
      `${tMod("blockConfirmTitle", { name: authorName })}\n\n${tMod(
        "blockConfirmBody",
      )}`,
    );
    if (!ok) return;
    try {
      await apiCall("/blocks", {
        method: "POST",
        token,
        body: { userId: post.author.id },
      });
      onHide?.();
    } catch {
      window.alert(tMod("blockErrorToast"));
    }
  }

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
          blurhash: m.blurhash ?? null,
        }))}
        timestamp={formatRelativeTime(post.createdAt, locale)}
        counts={post.counts}
        liked={post.viewer.reaction !== null}
        busy={busy}
        labels={{
          like: t("like"),
          liked: t("liked"),
          comment: t("comment"),
          repost: t("repost"),
          send: t("send"),
          commentsCount: (count) => t("commentsCount", { count }),
          repostsCount: (count) => t("repostsCount", { count }),
          authorLabel: `${post.author.firstName} ${post.author.lastName}`.trim(),
          moreOptions: tMod("more"),
          publicAudience: t("publicAudience"),
        }}
        commentsOpen={commentsOpen}
        onToggleComments={setCommentsOpen}
        onToggleReaction={() => void toggleReaction()}
        onOpenProfile={() => router.push(`/in/${post.author.handle}`)}
        moreMenu={
          <MoreMenu
            label={tMod("more")}
            items={[
              {
                key: "report",
                label: tMod("reportPost"),
                onClick: () => setReportOpen(true),
              },
              {
                key: "block",
                label: tMod("blockUser", { name: authorName }),
                onClick: () => void blockAuthor(),
                danger: true,
              },
            ]}
          />
        }
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
      <ReportDialog
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        targetKind="POST"
        targetId={post.id}
      />
    </>
  );
}
