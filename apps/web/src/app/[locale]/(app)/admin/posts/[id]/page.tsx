"use client";

import { AdminPostDetail, type AdminPostDetail as AdminPostDetailValue } from "@palnet/shared";
import { Avatar, Surface } from "@palnet/ui-web";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { ApiRequestError, apiCall, apiFetch } from "@/lib/api";
import { readSession } from "@/lib/session";

// Read-only post detail for moderators. Bypasses the takedown-hides-post
// filter so the body that was taken down is still inspectable. Linked from
// admin audit rows that carry a `targetPostId` and from the moderation
// console post-target reports.
export default function AdminPostDetailPage(): JSX.Element {
  const t = useTranslations("admin.posts");
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const postId = params?.id;

  const [token, setToken] = useState<string | null>(null);
  const [post, setPost] = useState<AdminPostDetailValue | null>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState(false);
  const [actionReason, setActionReason] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const session = readSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    setToken(session.tokens.accessToken);
  }, [router]);

  const load = useCallback(
    async (tk: string, id: string) => {
      setLoading(true);
      setForbidden(false);
      setNotFound(false);
      setError(false);
      try {
        const detail = await apiFetch(`/admin/posts/${id}`, AdminPostDetail, { token: tk });
        setPost(detail);
      } catch (e) {
        if (e instanceof ApiRequestError && e.status === 403) setForbidden(true);
        else if (e instanceof ApiRequestError && e.status === 404) setNotFound(true);
        else setError(true);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!token || !postId) return;
    void load(token, postId);
  }, [token, postId, load]);

  // Mutations are POSTs that return 204; on success, re-fetch detail so the
  // status banner / takedown block flips immediately. `apiCall` raises
  // `ApiRequestError` we map to a user-facing string instead of leaving the
  // page in an inconsistent state.
  async function runMutation(path: string, body: Record<string, unknown>): Promise<void> {
    if (!token || actionBusy) return;
    setActionBusy(true);
    setActionError(null);
    try {
      await apiCall(path, { method: "POST", token, body });
      setActionReason("");
      if (postId) await load(token, postId);
    } catch (e) {
      if (e instanceof ApiRequestError && e.status === 403) {
        setForbidden(true);
      } else {
        setActionError(t("actions.error"));
      }
    } finally {
      setActionBusy(false);
    }
  }

  async function takedown(): Promise<void> {
    if (!postId) return;
    const reason = actionReason.trim();
    if (!reason) {
      setActionError(t("actions.reasonRequired"));
      return;
    }
    await runMutation(`/admin/posts/${postId}/takedown`, { reason });
  }

  async function restore(): Promise<void> {
    if (!postId) return;
    const note = actionReason.trim();
    await runMutation(`/admin/posts/${postId}/restore`, note ? { note } : {});
  }

  if (forbidden) {
    return (
      <main className="mx-auto w-full max-w-[860px] px-4 py-6">
        <Surface variant="tinted" padding="8">
          <h1 className="text-ink text-lg font-semibold">{t("forbiddenTitle")}</h1>
          <p className="text-ink-muted mt-1 text-sm">{t("forbiddenBody")}</p>
        </Surface>
      </main>
    );
  }

  if (notFound) {
    return (
      <main className="mx-auto w-full max-w-[860px] px-4 py-6">
        <Surface variant="tinted" padding="8">
          <h1 className="text-ink text-lg font-semibold">{t("notFoundTitle")}</h1>
          <p className="text-ink-muted mt-1 text-sm">{t("notFoundBody")}</p>
        </Surface>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-[860px] px-4 py-6" data-testid="admin-post-detail">
      <header className="mb-4">
        <h1 className="text-ink text-xl font-semibold">{t("title")}</h1>
        <p className="text-ink-muted mt-1 text-sm">{t("description")}</p>
      </header>

      {loading && <p className="text-ink-muted text-sm">{t("loading")}</p>}
      {error && (
        <Surface variant="tinted" padding="6">
          <p className="text-ink text-sm">{t("error")}</p>
        </Surface>
      )}

      {post && (
        <Surface variant="card" padding="6" className="space-y-4">
          {/* Status banner — taken-down or soft-deleted post gets a tinted strip
              at the top so a moderator never confuses an active post for one
              that's been hidden from users. */}
          {(post.takedownAt || post.deletedAt) && (
            <Surface
              variant="tinted"
              padding="4"
              className="border-warning/40 bg-warning/10"
              data-testid="admin-post-status-banner"
            >
              {post.takedownAt && (
                <p className="text-ink text-sm">
                  <strong>{t("status.takendown")}</strong>
                  {post.takedownReason ? ` — ${post.takedownReason}` : ""}
                </p>
              )}
              {post.deletedAt && (
                <p className="text-ink mt-1 text-sm">
                  <strong>{t("status.deleted")}</strong>
                </p>
              )}
            </Surface>
          )}

          {/* Author */}
          <div className="flex items-center gap-3">
            <Avatar
              size="md"
              user={{
                id: post.author.userId,
                handle: post.author.handle,
                firstName: post.author.firstName,
                lastName: post.author.lastName,
                avatarUrl: post.author.avatarUrl,
              }}
            />
            <div>
              <p className="text-ink text-sm font-semibold">
                {[post.author.firstName, post.author.lastName].filter(Boolean).join(" ") ||
                  post.author.handle ||
                  post.author.userId}
              </p>
              {post.author.handle && (
                <p className="text-ink-muted text-xs">@{post.author.handle}</p>
              )}
            </div>
          </div>

          {/* Body */}
          <article
            dir="auto"
            className="text-ink whitespace-pre-wrap text-base"
            data-testid="admin-post-body"
          >
            {post.body}
          </article>

          {/* Media */}
          {post.media.length > 0 && (
            <ul className="grid grid-cols-2 gap-2">
              {post.media.map((m) => (
                <li key={m.id} className="overflow-hidden rounded-lg">
                  {m.kind === "IMAGE" ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={m.url} alt="" className="block h-auto w-full" />
                  ) : (
                    <video src={m.url} controls className="block h-auto w-full" />
                  )}
                </li>
              ))}
            </ul>
          )}

          {/* Counts */}
          <dl className="text-ink-muted grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
            <div>
              <dt>{t("counts.reactions")}</dt>
              <dd className="text-ink text-sm font-semibold">{post.counts.reactions}</dd>
            </div>
            <div>
              <dt>{t("counts.comments")}</dt>
              <dd className="text-ink text-sm font-semibold">{post.counts.comments}</dd>
            </div>
            <div>
              <dt>{t("counts.reposts")}</dt>
              <dd className="text-ink text-sm font-semibold">{post.counts.reposts}</dd>
            </div>
            <div>
              <dt>{t("counts.reports")}</dt>
              <dd className="text-ink text-sm font-semibold">{post.counts.reports}</dd>
            </div>
          </dl>

          {/* Takedown metadata */}
          {post.takedownAt && (
            <Surface variant="tinted" padding="4">
              <h2 className="text-ink text-sm font-semibold">{t("takedownDetails.title")}</h2>
              <p className="text-ink-muted mt-1 text-xs">
                {t("takedownDetails.at")}: {new Date(post.takedownAt).toLocaleString()}
              </p>
              {post.takedownBy && (
                <p className="text-ink-muted text-xs">
                  {t("takedownDetails.by")}:{" "}
                  {[post.takedownBy.firstName, post.takedownBy.lastName].filter(Boolean).join(" ") ||
                    post.takedownBy.handle ||
                    post.takedownBy.userId}
                </p>
              )}
              {post.takedownReason && (
                <p className="text-ink mt-2 text-sm">
                  {t("takedownDetails.reason")}: {post.takedownReason}
                </p>
              )}
            </Surface>
          )}

          {/* Timestamps */}
          <p className="text-ink-muted text-xs">
            {t("timestamps.createdAt")}: {new Date(post.createdAt).toLocaleString()} ·{" "}
            {t("timestamps.updatedAt")}: {new Date(post.updatedAt).toLocaleString()}
          </p>

          {/* Moderator actions — takedown when active, restore when down. The
              same reason field doubles as takedown reason (required) or
              restore note (optional). Re-fetch on success so banner flips. */}
          {!post.deletedAt && (
            <Surface variant="tinted" padding="4" className="space-y-2">
              <label
                htmlFor="admin-post-action-reason"
                className="text-ink block text-sm font-semibold"
              >
                {t("actions.reasonLabel")}
              </label>
              <textarea
                id="admin-post-action-reason"
                data-testid="admin-post-action-reason"
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                rows={3}
                className="border-line bg-surface text-ink w-full rounded-md border p-2 text-sm"
                disabled={actionBusy}
              />
              <div className="flex flex-wrap gap-2">
                {!post.takedownAt ? (
                  <button
                    type="button"
                    data-testid="admin-post-takedown"
                    onClick={() => void takedown()}
                    disabled={actionBusy}
                    className="bg-warning text-ink-inverse rounded-md px-3 py-1.5 text-sm font-semibold disabled:opacity-50"
                  >
                    {t("actions.takedown")}
                  </button>
                ) : (
                  <button
                    type="button"
                    data-testid="admin-post-restore"
                    onClick={() => void restore()}
                    disabled={actionBusy}
                    className="bg-brand-700 text-ink-inverse rounded-md px-3 py-1.5 text-sm font-semibold disabled:opacity-50"
                  >
                    {t("actions.restore")}
                  </button>
                )}
              </div>
              {actionError && (
                <p className="text-danger text-sm" data-testid="admin-post-action-error">
                  {actionError}
                </p>
              )}
            </Surface>
          )}
        </Surface>
      )}
    </main>
  );
}
