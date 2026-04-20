"use client";

import type { Post } from "@palnet/shared";
import { Surface } from "@palnet/ui-web";
import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";

import { Comments } from "@/components/Comments";
import { apiCall } from "@/lib/api";
import { getAccessToken } from "@/lib/session";

export function PostCard({
  post,
  onChange,
}: {
  post: Post;
  onChange?: (next: Post) => void;
}): JSX.Element {
  const t = useTranslations("post");
  const [busy, setBusy] = useState(false);
  const [showComments, setShowComments] = useState(false);

  async function toggleReaction(): Promise<void> {
    const token = getAccessToken();
    if (!token || busy) return;
    const wasLiked = post.viewer.reaction !== null;
    // Optimistic update
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
      // Roll back on failure
      onChange?.(post);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Surface as="article" variant="card" className="flex flex-col gap-3">
      <header className="flex flex-col">
        <Link
          href={`/in/${post.author.handle}`}
          className="font-semibold text-ink hover:underline"
        >
          {post.author.firstName} {post.author.lastName}
        </Link>
        {post.author.headline ? (
          <span className="text-sm text-ink-muted">{post.author.headline}</span>
        ) : null}
        <time className="text-xs text-ink-muted" dateTime={post.createdAt}>
          {new Date(post.createdAt).toLocaleString()}
        </time>
      </header>

      <p className="whitespace-pre-wrap text-ink">{post.body}</p>

      {post.media.length > 0 ? (
        <div
          className={
            post.media.length === 1
              ? "grid grid-cols-1 gap-1"
              : "grid grid-cols-2 gap-1"
          }
        >
          {post.media.map((m) =>
            m.kind === "IMAGE" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={m.id ?? m.url}
                src={m.url}
                alt=""
                className="max-h-96 w-full rounded-md border border-ink-muted/10 object-cover"
              />
            ) : null,
          )}
        </div>
      ) : null}

      <footer className="flex items-center gap-4 border-t border-ink-muted/10 pt-2 text-sm">
        <button
          type="button"
          onClick={toggleReaction}
          disabled={busy}
          className={
            post.viewer.reaction
              ? "font-semibold text-brand-600"
              : "text-ink-muted hover:text-ink"
          }
        >
          {post.viewer.reaction ? t("liked") : t("like")} ({post.counts.reactions})
        </button>
        <button
          type="button"
          onClick={() => setShowComments((s) => !s)}
          className="text-ink-muted hover:text-ink"
        >
          {t("comments")} ({post.counts.comments})
        </button>
        <span className="text-ink-muted">
          {t("reposts")}: {post.counts.reposts}
        </span>
      </footer>

      {showComments ? (
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
      ) : null}
    </Surface>
  );
}
