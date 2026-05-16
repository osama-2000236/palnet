"use client";

// Feed — the home page of the app.
// Spec: docs/_archive/prototype-2025 FeedPage.jsx (3-col grid: left mini-profile +
// center composer/posts + right PYMK/jobs).
//
// This file is the host: fetches the viewer's profile (for the mini-profile
// hero), paginates `/feed`, loads `/connections/suggestions` for the right
// rail, and delegates everything visual to @baydar/ui-web shells.

import {
  Job as JobSchema,
  type Job,
  PersonSuggestion as PersonSuggestionSchema,
  type PersonSuggestion,
  type Post,
  Post as PostSchema,
  Profile,
  cursorPage,
} from "@baydar/shared";
import {
  Avatar,
  Button,
  EmptyState,
  Icon,
  PostCardSkeleton,
  RetryChip,
  Surface,
} from "@baydar/ui-web";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { z } from "zod";

import { Composer } from "@/components/Composer";
import { PostCard } from "@/components/PostCard";
import { ApiRequestError, apiFetch, apiFetchPage } from "@/lib/api";
import { getErrorCode, toErrorMessage } from "@/lib/error-message";
import { getAccessToken, readSession } from "@/lib/session";

const FeedPage = cursorPage(PostSchema);
const JobsSuggestionsPage = cursorPage(JobSchema);
const SuggestionsEnvelope = z.object({
  data: z.array(PersonSuggestionSchema),
});
const ConnectionCountsEnvelope = z.object({
  accepted: z.number().int().nonnegative(),
  incoming: z.number().int().nonnegative(),
  outgoing: z.number().int().nonnegative(),
});

export default function FeedPageRoute(): JSX.Element {
  const t = useTranslations("feed");
  const tErr = useTranslations("errors");
  const router = useRouter();
  const locale = useLocale();
  const pathname = usePathname();
  const [me, setMe] = useState<Profile | null>(null);
  const [connectionCount, setConnectionCount] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<PersonSuggestion[]>([]);
  const [suggestionsError, setSuggestionsError] = useState(false);
  const [jobSuggestions, setJobSuggestions] = useState<Job[]>([]);
  const [jobSuggestionsError, setJobSuggestionsError] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [firstLoad, setFirstLoad] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (after: string | null): Promise<void> => {
      const token = getAccessToken();
      if (!token) return;
      setLoading(true);
      if (!after) setError(null);
      try {
        const qs = new URLSearchParams({ limit: "20" });
        if (after) qs.set("after", after);
        const page = await apiFetchPage(`/feed?${qs.toString()}`, FeedPage, {
          token,
        });
        setPosts((prev) => (after ? [...prev, ...page.data] : page.data));
        setCursor(page.meta.nextCursor);
        setHasMore(page.meta.hasMore);
      } catch (e) {
        const code = getErrorCode(e);
        const returnPath = pathname ?? "/feed";
        if (code === "PROFILE_ONBOARDING_REQUIRED") {
          router.replace(`/${locale}/onboarding?return=${encodeURIComponent(returnPath)}`);
          return;
        }
        if (
          code === "AUTH_UNAUTHORIZED" ||
          code === "UNAUTHORIZED" ||
          (e instanceof ApiRequestError && e.status === 401)
        ) {
          router.replace(`/login?return=${encodeURIComponent(returnPath)}`);
          return;
        }
        if (!after) setError(toErrorMessage(e, tErr));
      } finally {
        setLoading(false);
        if (!after) setFirstLoad(false);
      }
    },
    [locale, pathname, router, tErr],
  );

  const loadSuggestions = useCallback((token: string): void => {
    setSuggestionsError(false);
    void apiFetch("/connections/suggestions?limit=6", SuggestionsEnvelope, { token })
      .then((out) => setSuggestions(out.data))
      .catch(() => {
        setSuggestions([]);
        setSuggestionsError(true);
      });
  }, []);

  const loadJobSuggestions = useCallback((token: string): void => {
    setJobSuggestionsError(false);
    // Right-rail jobs — top 3 newest active jobs. Not personalized yet; a
    // real "suggested" endpoint that factors in skills + location is deferred.
    void apiFetchPage("/jobs?limit=3", JobsSuggestionsPage, { token })
      .then((page) => setJobSuggestions(page.data))
      .catch(() => {
        setJobSuggestions([]);
        setJobSuggestionsError(true);
      });
  }, []);

  useEffect(() => {
    const session = readSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    const token = session.tokens.accessToken;

    void apiFetch("/profiles/me", Profile, { token })
      .then(setMe)
      .catch(() => {});

    void apiFetch("/connections/counts", ConnectionCountsEnvelope, { token })
      .then((counts) => setConnectionCount(counts.accepted))
      .catch(() => setConnectionCount(null));

    loadSuggestions(token);
    loadJobSuggestions(token);

    void load(null);
  }, [router, load, loadSuggestions, loadJobSuggestions]);

  return (
    <main className="mx-auto grid w-full max-w-[1128px] grid-cols-1 items-start gap-6 px-4 py-6 lg:grid-cols-[225px_minmax(0,1fr)] lg:gap-6 lg:px-6 xl:grid-cols-[225px_minmax(0,1fr)_300px]">
      <h1 className="sr-only">{t("title")}</h1>
      <LeftRail me={me} connectionCount={connectionCount} />

      <div className="flex min-w-0 flex-col gap-3">
        <Composer me={me} onPosted={(p) => setPosts((prev) => [p, ...prev])} />

        {firstLoad && loading ? (
          <>
            <PostCardSkeleton />
            <PostCardSkeleton />
            <PostCardSkeleton />
          </>
        ) : error && posts.length === 0 ? (
          <FeedErrorState message={error} onRetry={() => void load(null)} loading={loading} />
        ) : posts.length === 0 ? (
          <FeedEmpty title={t("emptyTitle")} desc={t("emptyDesc")} />
        ) : (
          <ul className="flex flex-col gap-3">
            {posts.map((p) => (
              <li key={p.id}>
                <PostCard
                  post={p}
                  onChange={(next) =>
                    setPosts((prev) => prev.map((x) => (x.id === next.id ? next : x)))
                  }
                />
              </li>
            ))}
          </ul>
        )}

        {posts.length > 0 && hasMore ? (
          <button
            type="button"
            onClick={() => void load(cursor)}
            disabled={loading}
            className="border-line-soft bg-surface text-ink hover:bg-surface-subtle self-center rounded-md border px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? t("loadingMore") : t("loadMore")}
          </button>
        ) : null}
      </div>

      <RightRail
        suggestions={suggestions}
        suggestionsError={suggestionsError}
        onRetrySuggestions={() => {
          const token = getAccessToken();
          if (token) loadSuggestions(token);
        }}
        jobs={jobSuggestions}
        jobSuggestionsError={jobSuggestionsError}
        onRetryJobs={() => {
          const token = getAccessToken();
          if (token) loadJobSuggestions(token);
        }}
      />
    </main>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Left rail — mini profile hero + quick links
// ────────────────────────────────────────────────────────────────────────

function LeftRail({
  me,
  connectionCount,
}: {
  me: Profile | null;
  connectionCount: number | null;
}): JSX.Element {
  const t = useTranslations("feed.rail");
  const locale = useLocale();
  return (
    <aside
      aria-label={t("quickAccess")}
      className="hidden flex-col gap-3 lg:sticky lg:top-20 lg:flex"
    >
      <Surface variant="hero" padding="0" className="flex flex-col">
        <div className="from-brand-500 to-brand-700 h-14 bg-gradient-to-br" />
        <div className="-mt-7 px-4 pb-4">
          {me ? (
            <>
              <Avatar
                user={{
                  id: me.userId,
                  handle: me.handle,
                  firstName: me.firstName,
                  lastName: me.lastName,
                  avatarUrl: me.avatarUrl ?? null,
                }}
                size="lg"
                ring
              />
              <div className="text-ink mt-2 text-sm font-semibold">
                {`${me.firstName} ${me.lastName}`.trim()}
              </div>
              {me.headline ? (
                <div className="text-ink-muted mt-0.5 truncate text-xs">{me.headline}</div>
              ) : null}
            </>
          ) : (
            <div aria-hidden="true">
              <div className="bg-surface-sunken ring-surface h-14 w-14 animate-pulse rounded-full ring-[3px]" />
              <div className="bg-surface-sunken mt-3 h-4 w-32 animate-pulse rounded" />
              <div className="bg-surface-sunken mt-2 h-3 w-24 animate-pulse rounded" />
            </div>
          )}
        </div>
        <div className="border-line-soft border-t" />
        {me ? (
          <Link
            href={`/${locale}/network`}
            className="text-ink-muted hover:bg-surface-subtle focus-visible:bg-surface-subtle flex items-center justify-between px-4 py-2.5 text-xs focus:outline-none"
          >
            <span>{t("connections")}</span>
            <span className="text-brand-700 font-semibold tabular-nums">
              {connectionCount ?? "—"}
            </span>
          </Link>
        ) : null}
      </Surface>
    </aside>
  );
}
//
// Quick-access rail (Bookmarks / Groups / Events) was intentionally removed:
// none of those are MVP features per `docs/HANDOFF.md`, and aspirational
// links shipped in the chrome read as broken UX. Re-add a real card here
// when the corresponding feature ships, not before.

// ────────────────────────────────────────────────────────────────────────
// Right rail — people you may know + jobs placeholder + footer caption
// ────────────────────────────────────────────────────────────────────────

function RightRail({
  suggestions,
  suggestionsError,
  onRetrySuggestions,
  jobs,
  jobSuggestionsError,
  onRetryJobs,
}: {
  suggestions: PersonSuggestion[];
  suggestionsError: boolean;
  onRetrySuggestions: () => void;
  jobs: Job[];
  jobSuggestionsError: boolean;
  onRetryJobs: () => void;
}): JSX.Element {
  const t = useTranslations("feed.rail");
  const tCommon = useTranslations("common");
  const tJobs = useTranslations("jobs");
  const locale = useLocale();
  return (
    <aside aria-label={t("pymk")} className="hidden flex-col gap-3 xl:sticky xl:top-20 xl:flex">
      <Surface variant="card" padding="0">
        <div className="flex items-center justify-between px-4 pt-3">
          <span className="text-ink text-sm font-semibold">{t("pymk")}</span>
          <Link href="/network" className="text-ink-muted hover:text-brand-700 text-xs">
            {t("pymkAll")}
          </Link>
        </div>
        {suggestions.length > 0 ? (
          <ul className="flex flex-col">
            {suggestions.slice(0, 4).map((s) => (
              <li
                key={s.user.userId}
                className="border-line-soft flex items-start gap-2.5 border-t px-4 py-3 first:border-t-0"
              >
                <Avatar
                  user={{
                    id: s.user.userId,
                    handle: s.user.handle,
                    firstName: s.user.firstName,
                    lastName: s.user.lastName,
                    avatarUrl: s.user.avatarUrl ?? null,
                  }}
                  size="sm"
                />
                <div className="flex min-w-0 flex-1 flex-col">
                  <Link
                    href={`/in/${s.user.handle}`}
                    className="text-ink truncate text-sm font-semibold hover:underline"
                  >
                    {s.user.firstName} {s.user.lastName}
                  </Link>
                  {s.user.headline ? (
                    <span className="text-ink-muted truncate text-xs">{s.user.headline}</span>
                  ) : null}
                  <span className="text-ink-muted mt-0.5 text-[11px]">{t("pymkReason")}</span>
                </div>
                <Link
                  href={`/in/${s.user.handle}`}
                  className="border-brand-600 text-brand-700 hover:bg-brand-50 focus-visible:ring-brand-600 inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold focus:outline-none focus-visible:ring-2"
                >
                  <Icon name="plus" size={12} />
                  {t("connect")}
                </Link>
              </li>
            ))}
          </ul>
        ) : suggestionsError ? (
          <div className="flex items-center justify-end px-4 py-3">
            <RetryChip onRetry={onRetrySuggestions} label={tCommon("retry")} />
          </div>
        ) : (
          <div className="text-ink-muted px-4 py-3 text-xs">—</div>
        )}
      </Surface>

      <Surface variant="card" padding="0">
        <div className="flex items-center justify-between px-4 pt-3">
          <span className="text-ink text-sm font-semibold">{t("jobs")}</span>
          <Link href={`/${locale}/jobs`} className="text-ink-muted hover:text-brand-700 text-xs">
            {t("pymkAll")}
          </Link>
        </div>
        {jobs.length > 0 ? (
          <ul className="flex flex-col">
            {jobs.map((j) => {
              const metaParts = [j.city, tJobs(`locationLabels.${j.locationMode}`)].filter(
                Boolean,
              ) as string[];
              return (
                <li key={j.id} className="border-line-soft border-t px-4 py-3 first:border-t-0">
                  <Link
                    href={`/jobs/${j.id}`}
                    className="flex items-start gap-2.5 hover:opacity-90"
                  >
                    <div
                      className="bg-surface-sunken text-ink-muted flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md text-xs font-semibold"
                      aria-hidden="true"
                    >
                      {j.company.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={j.company.logoUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        (j.company.name[0] ?? "?").toUpperCase()
                      )}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="text-ink truncate text-sm font-semibold">{j.title}</span>
                      <span className="text-ink-muted truncate text-xs">{j.company.name}</span>
                      {metaParts.length > 0 ? (
                        <span className="text-ink-muted mt-0.5 truncate text-[11px]">
                          {metaParts.join(" · ")}
                        </span>
                      ) : null}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : jobSuggestionsError ? (
          <div className="flex items-center justify-end px-4 py-3">
            <RetryChip onRetry={onRetryJobs} label={tCommon("retry")} />
          </div>
        ) : (
          <div className="px-4 py-3 text-xs">
            <Link href={`/${locale}/jobs`} className="text-ink-muted hover:text-brand-700">
              {t("jobsEmpty")}
            </Link>
          </div>
        )}
      </Surface>
    </aside>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Empty state — shown when the server returns zero posts.
// ────────────────────────────────────────────────────────────────────────

function FeedEmpty({ title, desc }: { title: string; desc: string }): JSX.Element {
  return (
    <Surface variant="card" padding="0">
      <EmptyState motif="feed" title={title} body={desc} />
    </Surface>
  );
}

// Shown only when the initial /feed fetch fails AND there are no posts to
// render. Subsequent paginate-on-scroll failures are silent.
function FeedErrorState({
  message,
  onRetry,
  loading,
}: {
  message: string;
  onRetry: () => void;
  loading: boolean;
}): JSX.Element {
  const tCommon = useTranslations("common");
  return (
    <Surface variant="tinted" padding="6" className="flex flex-col items-center gap-3 text-center">
      <p className="text-ink-muted text-sm">{message}</p>
      <Button variant="secondary" size="sm" onClick={onRetry} disabled={loading}>
        {tCommon("retry")}
      </Button>
    </Surface>
  );
}
