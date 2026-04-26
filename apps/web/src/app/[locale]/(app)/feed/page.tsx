"use client";

// Feed — the home page of the app.
// Spec: docs/design/prototype FeedPage.jsx (3-col grid: left mini-profile +
// center composer/posts + right PYMK/jobs).
//
// This file is the host: fetches the viewer's profile (for the mini-profile
// hero), paginates `/feed`, loads `/connections/suggestions` for the right
// rail, and delegates everything visual to @palnet/ui-web shells.

import {
  Job as JobSchema,
  type Job,
  PersonSuggestion as PersonSuggestionSchema,
  type PersonSuggestion,
  type Post,
  Post as PostSchema,
  Profile,
  cursorPage,
} from "@palnet/shared";
import { Avatar, Icon, PostCardSkeleton, Surface, type IconName } from "@palnet/ui-web";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { z } from "zod";

import { Composer } from "@/components/Composer";
import { PostCard } from "@/components/PostCard";
import { apiFetch, apiFetchPage } from "@/lib/api";
import { getAccessToken, readSession } from "@/lib/session";

const FeedPage = cursorPage(PostSchema);
const JobsSuggestionsPage = cursorPage(JobSchema);
const SuggestionsEnvelope = z.object({
  data: z.array(PersonSuggestionSchema),
});

export default function FeedPageRoute(): JSX.Element {
  const t = useTranslations("feed");
  const router = useRouter();
  const [me, setMe] = useState<Profile | null>(null);
  const [suggestions, setSuggestions] = useState<PersonSuggestion[]>([]);
  const [jobSuggestions, setJobSuggestions] = useState<Job[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [firstLoad, setFirstLoad] = useState(true);

  const load = useCallback(async (after: string | null): Promise<void> => {
    const token = getAccessToken();
    if (!token) return;
    setLoading(true);
    try {
      const qs = new URLSearchParams({ limit: "20" });
      if (after) qs.set("after", after);
      const page = await apiFetchPage(`/feed?${qs.toString()}`, FeedPage, {
        token,
      });
      setPosts((prev) => (after ? [...prev, ...page.data] : page.data));
      setCursor(page.meta.nextCursor);
      setHasMore(page.meta.hasMore);
    } finally {
      setLoading(false);
      if (!after) setFirstLoad(false);
    }
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

    void apiFetch("/connections/suggestions?limit=6", SuggestionsEnvelope, { token })
      .then((out) => setSuggestions(out.data))
      .catch(() => setSuggestions([]));

    // Right-rail jobs — top 3 newest active jobs. Not personalized yet; a
    // real "suggested" endpoint that factors in skills + location is deferred.
    void apiFetchPage("/jobs?limit=3", JobsSuggestionsPage, { token })
      .then((page) => setJobSuggestions(page.data))
      .catch(() => setJobSuggestions([]));

    void load(null);
  }, [router, load]);

  return (
    <main className="max-w-chrome mx-auto grid w-full grid-cols-1 items-start gap-6 px-4 py-6 lg:grid-cols-[225px_minmax(0,1fr)_300px] lg:gap-6 lg:px-6">
      <h1 className="sr-only">{t("title")}</h1>
      <LeftRail me={me} />

      <div className="flex min-w-0 flex-col gap-3">
        <Composer me={me} onPosted={(p) => setPosts((prev) => [p, ...prev])} />

        {firstLoad && loading ? (
          <>
            <PostCardSkeleton />
            <PostCardSkeleton />
            <PostCardSkeleton />
          </>
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
                  onHide={() => setPosts((prev) => prev.filter((x) => x.author.id !== p.author.id))}
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

      <RightRail suggestions={suggestions} jobs={jobSuggestions} />
    </main>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Left rail — mini profile hero + quick links
// ────────────────────────────────────────────────────────────────────────

function LeftRail({ me }: { me: Profile | null }): JSX.Element {
  const t = useTranslations("feed.rail");
  return (
    <div className="hidden flex-col gap-3 lg:sticky lg:top-20 lg:flex">
      <Surface variant="hero" padding="0" className="flex flex-col">
        <div className="from-brand-500 to-brand-700 h-14 bg-gradient-to-br" />
        <div className="-mt-7 px-4 pb-4">
          <Avatar
            user={
              me
                ? {
                    id: me.userId,
                    handle: me.handle,
                    firstName: me.firstName,
                    lastName: me.lastName,
                    avatarUrl: me.avatarUrl ?? null,
                  }
                : { id: "pending", firstName: "", lastName: "" }
            }
            size="lg"
            ring
          />
          <div className="text-ink mt-2 text-sm font-semibold">
            {me ? `${me.firstName} ${me.lastName}`.trim() : ""}
          </div>
          {me?.headline ? (
            <div className="text-ink-muted mt-0.5 truncate text-xs">{me.headline}</div>
          ) : null}
        </div>
        <div className="border-line-soft border-t" />
        {me ? (
          <Link
            href={`/in/${me.handle}`}
            className="text-ink-muted hover:bg-surface-subtle focus-visible:bg-surface-subtle flex items-center justify-between px-4 py-2.5 text-xs focus:outline-none"
          >
            <span>{t("connections")}</span>
            <span className="text-brand-700 font-semibold tabular-nums">—</span>
          </Link>
        ) : null}
      </Surface>

      <Surface variant="flat" padding="3">
        <div className="text-ink-muted mb-2 text-xs">{t("quickAccess")}</div>
        <ul className="flex flex-col">
          <QuickLink icon="bookmark" label={t("saved")} />
          <QuickLink icon="users" label={t("groups")} />
          <QuickLink icon="calendar" label={t("events")} />
        </ul>
      </Surface>
    </div>
  );
}

function QuickLink({ icon, label }: { icon: IconName; label: string }): JSX.Element {
  return (
    <li>
      <button
        type="button"
        className="text-ink-muted hover:bg-surface-subtle hover:text-ink focus-visible:ring-brand-600 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-start text-sm focus:outline-none focus-visible:ring-2"
      >
        <Icon name={icon} size={14} />
        {label}
      </button>
    </li>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Right rail — people you may know + jobs placeholder + footer caption
// ────────────────────────────────────────────────────────────────────────

function RightRail({
  suggestions,
  jobs,
}: {
  suggestions: PersonSuggestion[];
  jobs: Job[];
}): JSX.Element {
  const t = useTranslations("feed.rail");
  const tJobs = useTranslations("jobs");
  return (
    <div className="hidden flex-col gap-3 lg:sticky lg:top-20 lg:flex">
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
                  <span className="text-ink-muted text-nav mt-0.5">{t("pymkReason")}</span>
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
        ) : (
          <div className="text-ink-muted px-4 py-3 text-xs">—</div>
        )}
      </Surface>

      <Surface variant="card" padding="0">
        <div className="flex items-center justify-between px-4 pt-3">
          <span className="text-ink text-sm font-semibold">{t("jobs")}</span>
          <Link href="/jobs" className="text-ink-muted hover:text-brand-700 text-xs">
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
                        <span className="text-ink-muted text-nav mt-0.5 truncate">
                          {metaParts.join(" · ")}
                        </span>
                      ) : null}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="text-ink-muted px-4 py-3 text-xs">{t("jobsComingSoon")}</div>
        )}
      </Surface>

      <p className="text-ink-muted text-nav text-center">{t("footer")}</p>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Empty state — shown when the server returns zero posts.
// ────────────────────────────────────────────────────────────────────────

function FeedEmpty({ title, desc }: { title: string; desc: string }): JSX.Element {
  return (
    <Surface variant="tinted" padding="6" className="flex flex-col items-center gap-2 text-center">
      <span className="bg-brand-50 text-brand-700 inline-flex h-10 w-10 items-center justify-center rounded-full">
        <Icon name="home" size={20} />
      </span>
      <h2 className="text-ink text-base font-semibold">{title}</h2>
      <p className="text-ink-muted max-w-md text-sm">{desc}</p>
    </Surface>
  );
}
