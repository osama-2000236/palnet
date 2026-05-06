"use client";

// Thin web wrapper around @baydar/ui-web's <PostCard>. The shared component
// owns the visual shell and state machine; this file owns the network (reaction
// API call + optimistic reconcile) and mounts our existing Comments region
// into the shared card via `commentsSlot`.

import { ReportReason, formatRelativeTime, type Post } from "@baydar/shared";
import { PostCard as PostCardShell, ReportDialog, type ReportDialogLabels } from "@baydar/ui-web";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Comments } from "@/components/Comments";
import { apiCall } from "@/lib/api";
import { useReport } from "@/lib/api/safety";
import { getAccessToken } from "@/lib/session";

export function PostCard({
  post,
  onChange,
}: {
  post: Post;
  onChange?: (next: Post) => void;
}): JSX.Element {
  const t = useTranslations("post");
  const tCommon = useTranslations("common");
  const tSafety = useTranslations("safety");
  const locale = useLocale();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const report = useReport();

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

  const reportLabels: ReportDialogLabels = {
    title: tSafety("report.title"),
    detailsLabel: tSafety("report.details_label"),
    cancel: tCommon("cancel"),
    submit: tSafety("report.submit"),
    close: tSafety("report.close"),
    reasons: {
      [ReportReason.SPAM]: tSafety("report.reason.spam"),
      [ReportReason.HARASSMENT]: tSafety("report.reason.harassment"),
      [ReportReason.HATE]: tSafety("report.reason.hate"),
      [ReportReason.MISINFORMATION]: tSafety("report.reason.misinformation"),
      [ReportReason.NUDITY]: tSafety("report.reason.nudity"),
      [ReportReason.VIOLENCE]: tSafety("report.reason.violence"),
      [ReportReason.OTHER]: tSafety("report.reason.other"),
    },
  };

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
        moreOptions: t("moreOptions"),
        report: tSafety("report.action"),
        publicAudience: t("publicAudience"),
      }}
      commentsOpen={commentsOpen}
      onToggleComments={setCommentsOpen}
      onToggleReaction={() => void toggleReaction()}
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
              setNotice(tSafety("report.success"));
            },
            onError: () => setNotice(tSafety("report.error")),
          });
        }}
      />
      {notice ? (
        <p className="text-ink-muted mt-2 text-sm" role="status">
          {notice}
        </p>
      ) : null}
    </>
  );
}
