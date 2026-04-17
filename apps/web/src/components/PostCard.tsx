"use client";

import type { Post } from "@palnet/shared";
import { useState } from "react";
import { useTranslations } from "next-intl";

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

  async function toggleReaction(): Promise<void> {
    const token = getAccessToken();
    if (!token) return;
    setBusy(true);
    try {
      if (post.viewer.reaction) {
        await fetch(
          `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1"}/posts/${post.id}/reaction`,
          { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
        );
        onChange?.({
          ...post,
          viewer: { ...post.viewer, reaction: null },
          counts: {
            ...post.counts,
            reactions: Math.max(0, post.counts.reactions - 1),
          },
        });
      } else {
        await fetch(
          `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1"}/posts/${post.id}/reaction`,
          {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ type: "LIKE" }),
          },
        );
        onChange?.({
          ...post,
          viewer: { ...post.viewer, reaction: "LIKE" },
          counts: { ...post.counts, reactions: post.counts.reactions + 1 },
        });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="flex flex-col gap-3 rounded-md border border-ink-muted/20 bg-white p-4 shadow-card">
      <header className="flex flex-col">
        <span className="font-semibold text-ink">
          {post.author.firstName} {post.author.lastName}
        </span>
        {post.author.headline ? (
          <span className="text-sm text-ink-muted">{post.author.headline}</span>
        ) : null}
        <time className="text-xs text-ink-muted" dateTime={post.createdAt}>
          {new Date(post.createdAt).toLocaleString()}
        </time>
      </header>

      <p className="whitespace-pre-wrap text-ink">{post.body}</p>

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
        <span className="text-ink-muted">
          {t("comments")}: {post.counts.comments}
        </span>
        <span className="text-ink-muted">
          {t("reposts")}: {post.counts.reposts}
        </span>
      </footer>
    </article>
  );
}
