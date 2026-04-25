"use client";

import { AdminUserDetail, type AdminUserDetail as AdminUserDetailValue } from "@palnet/shared";
import { Avatar, Surface } from "@palnet/ui-web";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { ApiRequestError, apiCall, apiFetch } from "@/lib/api";
import { readSession } from "@/lib/session";

// Read-only user detail for moderators with suspend/unsuspend CTAs. Linked
// from audit log rows that carry a `targetUserId` and from any future
// user-target moderation surfaces. The endpoint includes profile + counts
// + suspension metadata so the page renders in one request.
export default function AdminUserDetailPage(): JSX.Element {
  const t = useTranslations("admin.users");
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const userId = params?.id;

  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AdminUserDetailValue | null>(null);
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

  const load = useCallback(async (tk: string, id: string) => {
    setLoading(true);
    setForbidden(false);
    setNotFound(false);
    setError(false);
    try {
      const detail = await apiFetch(`/admin/users/${id}`, AdminUserDetail, { token: tk });
      setUser(detail);
    } catch (e) {
      if (e instanceof ApiRequestError && e.status === 403) setForbidden(true);
      else if (e instanceof ApiRequestError && e.status === 404) setNotFound(true);
      else setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!token || !userId) return;
    void load(token, userId);
  }, [token, userId, load]);

  async function runMutation(path: string, body: Record<string, unknown>): Promise<void> {
    if (!token || actionBusy) return;
    setActionBusy(true);
    setActionError(null);
    try {
      await apiCall(path, { method: "POST", token, body });
      setActionReason("");
      if (userId) await load(token, userId);
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

  async function suspend(): Promise<void> {
    if (!userId) return;
    const reason = actionReason.trim();
    if (!reason) {
      setActionError(t("actions.reasonRequired"));
      return;
    }
    await runMutation(`/admin/users/${userId}/suspend`, { reason });
  }

  async function unsuspend(): Promise<void> {
    if (!userId) return;
    const note = actionReason.trim();
    await runMutation(`/admin/users/${userId}/unsuspend`, note ? { note } : {});
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
    <main className="mx-auto w-full max-w-[860px] px-4 py-6" data-testid="admin-user-detail">
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

      {user && (
        <Surface variant="card" padding="6" className="space-y-4">
          {/* Status banner — suspended or soft-deleted user gets a tinted strip
              at the top so the moderator never confuses an active account
              for one that's been locked out. */}
          {(user.suspendedAt || user.deletedAt) && (
            <Surface
              variant="tinted"
              padding="4"
              className="border-warning/40 bg-warning/10"
              data-testid="admin-user-status-banner"
            >
              {user.suspendedAt && (
                <p className="text-ink text-sm">
                  <strong>{t("status.suspended")}</strong>
                  {user.suspendedReason ? ` — ${user.suspendedReason}` : ""}
                </p>
              )}
              {user.deletedAt && (
                <p className="text-ink mt-1 text-sm">
                  <strong>{t("status.deleted")}</strong>
                </p>
              )}
            </Surface>
          )}

          {/* Identity */}
          <div className="flex items-center gap-3">
            <Avatar
              size="md"
              user={{
                id: user.id,
                handle: user.profile?.handle ?? null,
                firstName: user.profile?.firstName ?? null,
                lastName: user.profile?.lastName ?? null,
                avatarUrl: user.profile?.avatarUrl ?? null,
              }}
            />
            <div>
              <p className="text-ink text-sm font-semibold">
                {user.profile
                  ? [user.profile.firstName, user.profile.lastName].filter(Boolean).join(" ") ||
                    user.profile.handle ||
                    user.id
                  : user.id}
              </p>
              {user.profile?.handle && (
                <p className="text-ink-muted text-xs">@{user.profile.handle}</p>
              )}
              <p className="text-ink-muted text-xs">{user.email}</p>
            </div>
          </div>

          {/* Profile fields */}
          {user.profile &&
            (user.profile.headline || user.profile.about || user.profile.location) && (
              <div className="space-y-1">
                {user.profile.headline && (
                  <p className="text-ink text-sm" data-testid="admin-user-headline">
                    {user.profile.headline}
                  </p>
                )}
                {user.profile.location && (
                  <p className="text-ink-muted text-xs">
                    {user.profile.location}
                    {user.profile.country ? `, ${user.profile.country}` : ""}
                  </p>
                )}
                {user.profile.about && (
                  <p
                    dir="auto"
                    className="text-ink whitespace-pre-wrap text-sm"
                    data-testid="admin-user-about"
                  >
                    {user.profile.about}
                  </p>
                )}
              </div>
            )}

          {/* Account meta */}
          <dl className="text-ink-muted grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
            <div>
              <dt>{t("meta.role")}</dt>
              <dd className="text-ink text-sm font-semibold">{user.role}</dd>
            </div>
            <div>
              <dt>{t("meta.locale")}</dt>
              <dd className="text-ink text-sm font-semibold">{user.locale}</dd>
            </div>
            <div>
              <dt>{t("meta.active")}</dt>
              <dd className="text-ink text-sm font-semibold">
                {user.isActive ? t("meta.activeYes") : t("meta.activeNo")}
              </dd>
            </div>
            <div>
              <dt>{t("meta.lastSeen")}</dt>
              <dd className="text-ink text-sm font-semibold">
                {user.lastSeenAt ? new Date(user.lastSeenAt).toLocaleString() : "—"}
              </dd>
            </div>
          </dl>

          {/* Counts */}
          <dl className="text-ink-muted grid grid-cols-2 gap-2 text-xs sm:grid-cols-5">
            <div>
              <dt>{t("counts.posts")}</dt>
              <dd className="text-ink text-sm font-semibold">{user.counts.posts}</dd>
            </div>
            <div>
              <dt>{t("counts.comments")}</dt>
              <dd className="text-ink text-sm font-semibold">{user.counts.comments}</dd>
            </div>
            <div>
              <dt>{t("counts.reportsAgainst")}</dt>
              <dd className="text-ink text-sm font-semibold">{user.counts.reportsAgainst}</dd>
            </div>
            <div>
              <dt>{t("counts.reportsFiled")}</dt>
              <dd className="text-ink text-sm font-semibold">{user.counts.reportsFiled}</dd>
            </div>
            <div>
              <dt>{t("counts.takedowns")}</dt>
              <dd className="text-ink text-sm font-semibold">{user.counts.takedowns}</dd>
            </div>
          </dl>

          {/* Suspension metadata */}
          {user.suspendedAt && (
            <Surface variant="tinted" padding="4">
              <h2 className="text-ink text-sm font-semibold">{t("suspensionDetails.title")}</h2>
              <p className="text-ink-muted mt-1 text-xs">
                {t("suspensionDetails.at")}: {new Date(user.suspendedAt).toLocaleString()}
              </p>
              {user.suspendedBy && (
                <p className="text-ink-muted text-xs">
                  {t("suspensionDetails.by")}:{" "}
                  {[user.suspendedBy.firstName, user.suspendedBy.lastName]
                    .filter(Boolean)
                    .join(" ") ||
                    user.suspendedBy.handle ||
                    user.suspendedBy.userId}
                </p>
              )}
              {user.suspendedReason && (
                <p className="text-ink mt-2 text-sm">
                  {t("suspensionDetails.reason")}: {user.suspendedReason}
                </p>
              )}
            </Surface>
          )}

          {/* Timestamps */}
          <p className="text-ink-muted text-xs">
            {t("timestamps.createdAt")}: {new Date(user.createdAt).toLocaleString()} ·{" "}
            {t("timestamps.updatedAt")}: {new Date(user.updatedAt).toLocaleString()}
          </p>

          {/* Moderator actions — suspend when active, unsuspend when locked.
              Same reason field doubles as suspension reason (required) or
              unsuspend note (optional). Re-fetch on success. */}
          {!user.deletedAt && (
            <Surface variant="tinted" padding="4" className="space-y-2">
              <label
                htmlFor="admin-user-action-reason"
                className="text-ink block text-sm font-semibold"
              >
                {t("actions.reasonLabel")}
              </label>
              <textarea
                id="admin-user-action-reason"
                data-testid="admin-user-action-reason"
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                rows={3}
                className="border-line bg-surface text-ink w-full rounded-md border p-2 text-sm"
                disabled={actionBusy}
              />
              <div className="flex flex-wrap gap-2">
                {!user.suspendedAt ? (
                  <button
                    type="button"
                    data-testid="admin-user-suspend"
                    onClick={() => void suspend()}
                    disabled={actionBusy}
                    className="bg-warning text-ink-inverse rounded-md px-3 py-1.5 text-sm font-semibold disabled:opacity-50"
                  >
                    {t("actions.suspend")}
                  </button>
                ) : (
                  <button
                    type="button"
                    data-testid="admin-user-unsuspend"
                    onClick={() => void unsuspend()}
                    disabled={actionBusy}
                    className="bg-brand-700 text-ink-inverse rounded-md px-3 py-1.5 text-sm font-semibold disabled:opacity-50"
                  >
                    {t("actions.unsuspend")}
                  </button>
                )}
              </div>
              {actionError && (
                <p className="text-danger text-sm" data-testid="admin-user-action-error">
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
