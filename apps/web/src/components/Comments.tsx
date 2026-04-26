"use client";

import {
  Comment as CommentSchema,
  CreateCommentBody,
  cursorPage,
  type Comment,
} from "@baydar/shared";
import { Avatar } from "@baydar/ui-web";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { MoreMenu } from "@/components/MoreMenu";
import { ReportDialog } from "@/components/ReportDialog";
import { apiFetch, apiFetchPage } from "@/lib/api";
import { getAccessToken } from "@/lib/session";

const CommentsPage = cursorPage(CommentSchema);

export function Comments({
  postId,
  onCountChange,
}: {
  postId: string;
  onCountChange?: (delta: number) => void;
}): JSX.Element {
  const t = useTranslations("post");
  const tModeration = useTranslations("moderation");
  const [items, setItems] = useState<Comment[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportCommentId, setReportCommentId] = useState<string | null>(null);

  const load = useCallback(
    async (after: string | null): Promise<void> => {
      setLoading(true);
      try {
        const token = getAccessToken() ?? undefined;
        const qs = new URLSearchParams({ limit: "20" });
        if (after) qs.set("after", after);
        const page = await apiFetchPage(
          `/posts/${postId}/comments?${qs.toString()}`,
          CommentsPage,
          { token },
        );
        setItems((prev) => (after ? [...prev, ...page.data] : page.data));
        setCursor(page.meta.nextCursor);
        setHasMore(page.meta.hasMore);
      } finally {
        setLoading(false);
      }
    },
    [postId],
  );

  useEffect(() => {
    void load(null);
  }, [load]);

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    const parsed = CreateCommentBody.safeParse({ body: draft });
    if (!parsed.success) return;
    const token = getAccessToken();
    if (!token) return;
    setBusy(true);
    try {
      const created = await apiFetch(`/posts/${postId}/comments`, CommentSchema, {
        method: "POST",
        body: parsed.data,
        token,
      });
      setItems((prev) => [...prev, created]);
      setDraft("");
      onCountChange?.(1);
    } catch {
      setError(t("commentError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border-ink-muted/10 mt-3 flex flex-col gap-3 border-t pt-3">
      {items.length === 0 && !loading ? null : (
        <ul className="flex flex-col gap-2">
          {items.map((c) => (
            <li
              key={c.id}
              className="bg-surface-muted flex items-start gap-2 rounded-md px-3 py-2 text-sm"
            >
              <Link
                href={`/in/${c.author.handle}`}
                aria-label={`${c.author.firstName} ${c.author.lastName}`}
              >
                <Avatar user={c.author} size="sm" />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex min-w-0 items-start justify-between gap-2">
                  <Link
                    href={`/in/${c.author.handle}`}
                    className="text-ink min-w-0 truncate font-semibold hover:underline"
                  >
                    {c.author.firstName} {c.author.lastName}
                  </Link>
                  <MoreMenu
                    label={tModeration("more")}
                    items={[
                      {
                        key: "report",
                        label: tModeration("reportComment"),
                        onClick: () => setReportCommentId(c.id),
                      },
                    ]}
                  />
                </div>
                <p className="text-ink whitespace-pre-wrap">{c.body}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {hasMore ? (
        <button
          type="button"
          onClick={() => void load(cursor)}
          disabled={loading}
          className="text-ink-muted self-start text-xs hover:underline"
        >
          {t("loadMoreComments")}
        </button>
      ) : null}

      <form onSubmit={submit} className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t("commentPlaceholder")}
          maxLength={2000}
          className="border-ink-muted/30 bg-surface text-ink flex-1 rounded-md border px-3 py-1.5 text-sm"
        />
        <button
          type="submit"
          disabled={busy || draft.trim().length === 0}
          className="bg-brand-600 text-ink-inverse rounded-md px-3 py-1.5 text-sm font-semibold disabled:opacity-60"
        >
          {t("commentSubmit")}
        </button>
      </form>
      {error ? (
        <span className="text-danger text-xs" role="alert">
          {error}
        </span>
      ) : null}
      <ReportDialog
        open={reportCommentId !== null}
        targetKind="COMMENT"
        targetId={reportCommentId ?? ""}
        onClose={() => setReportCommentId(null)}
      />
    </div>
  );
}
