"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { z } from "zod";

import { apiFetch, apiFetchPage } from "@/lib/api";
import { getAccessToken } from "@/lib/session";
import {
  cursorPage,
  formatRelativeTime,
  getBandwidthPolicy,
  offlineCacheKeys,
  readThrough,
  Job as JobSchema,
  PersonSuggestion as PersonSuggestionSchema,
  Post as PostSchema,
  Profile as ProfileSchema,
} from "@baydar/shared";
import type { Job, PersonSuggestion, Post } from "@baydar/shared";
import {
  Button,
  EmptyState,
  PostCardSkeleton,
  RetryChip,
  staggerDelay,
  Surface,
} from "@baydar/ui-web";
import { Composer } from "@/components/Composer";
import { OutboxTrayHost } from "@/components/OutboxTrayHost";
import { offlineCache } from "@/lib/offline-cache";
import { FeedErrorState } from "./_components/FeedErrorState";
import { fetchFeedPage } from "./_components/fetchFeedPage";
import { PostCard } from "@/components/PostCard";
import { RightRail } from "../components/RightRail";
import { OnboardingDoneCard } from "./OnboardingDoneCard";
import { ProfileCompletenessCard } from "./ProfileCompletenessCard";

const JobsPage = cursorPage(JobSchema);
const Suggestions = z.array(PersonSuggestionSchema);

type HitState = {
  posts: Post[];
};
type CursorState = {
  posts: string | null;
};
type MoreState = {
  posts: boolean;
};

const emptyHits: HitState = { posts: [] };
const emptyCursor: CursorState = { posts: null };
const emptyMore: MoreState = { posts: false };

export default function FeedPageRoute(): JSX.Element {
  return (
    <Suspense fallback={null}>
      <FeedInner />
    </Suspense>
  );
}

function FeedInner(): JSX.Element {
  const t = useTranslations("feed");
  const tConnection = useTranslations("connection");
  const locale = useLocale();
  const router = useRouter();
  const params = useSearchParams();
  const [posts, setPosts] = useState<HitState>(emptyHits);
  const [cursors, setCursors] = useState<CursorState>(emptyCursor);
  const [hasMore, setHasMore] = useState<MoreState>(emptyMore);
  const [requestAfter, setRequestAfter] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<PersonSuggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(true);
  const [suggestionsError, setSuggestionsError] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [jobsError, setJobsError] = useState(false);

  // Viewer profile feeds the composer avatar and the completeness card.
  // Non-blocking: the feed renders without it, the extras appear when it lands.
  const meQuery = useQuery({
    queryKey: ["profiles", "me"],
    queryFn: async () => {
      const token = getAccessToken() ?? undefined;
      return apiFetch("/profiles/me", ProfileSchema, { token });
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
  const me = meQuery.data ?? null;

  const query = useQuery({
    queryKey: ["feed", requestAfter],
    enabled: true,
    queryFn: async () => fetchFeedPage(requestAfter),
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 60 * 1000, // 1 minute
  });

  // Non-null only when the page came from the cache. Rendered as «آخر تحديث»,
  // because stale data presented as live is worse than no data — a member acts
  // on it.
  const [staleSince, setStaleSince] = useState<number | null>(null);

  useEffect(() => {
    if (!query.data) return;
    const { body: page, stale, storedAt } = query.data;
    setError(null);
    setStaleSince(stale ? storedAt : null);
    setPosts((prev) => ({
      ...prev,
      posts: requestAfter ? [...prev.posts, ...page.data] : page.data,
    }));
    setCursors((prev) => ({ ...prev, posts: page.meta.nextCursor }));
    setHasMore((prev) => ({ ...prev, posts: page.meta.hasMore }));
  }, [query.data, requestAfter]);

  useEffect(() => {
    if (!query.isError) return;
    setError(t("errorBody"));
    if (!requestAfter) {
      setPosts((prev) => ({ ...prev, posts: [] }));
      setCursors((prev) => ({ ...prev, posts: null }));
      setHasMore((prev) => ({ ...prev, posts: false }));
    }
  }, [query.isError, requestAfter, t]);

  const loadingInitial = query.isFetching && posts.posts.length === 0 && !error;
  const showError = Boolean(error) && !query.isFetching;
  const onboarded = params?.get("onboarded") === "1";

  const loadSuggestions = useCallback(async (): Promise<void> => {
    const token = getAccessToken() ?? undefined;
    setSuggestionsLoading(true);
    try {
      const next = await apiFetch("/connections/suggestions?limit=4", Suggestions, { token });
      setSuggestions(next);
      setSuggestionsError(false);
    } catch {
      setSuggestions([]);
      setSuggestionsError(true);
    } finally {
      setSuggestionsLoading(false);
    }
  }, []);

  const loadRailJobs = useCallback(async (): Promise<void> => {
    const token = getAccessToken() ?? undefined;
    setJobsLoading(true);
    try {
      const page = await apiFetchPage("/jobs?limit=3", JobsPage, { token });
      setJobs(page.data);
      setJobsError(false);
    } catch {
      setJobs([]);
      setJobsError(true);
    } finally {
      setJobsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSuggestions();
    void loadRailJobs();
  }, [loadSuggestions, loadRailJobs]);

  function clearOnboardingQuery(): void {
    const url = new URL(window.location.href);
    url.searchParams.delete("onboarded");
    router.replace(url.pathname + url.search);
  }

  return (
    <main className="flex min-h-[calc(100vh-4rem)] w-full items-start justify-center gap-8 px-6 py-8">
      {/* Left: Feed */}
      <Suspense fallback={null}>
        <div className="w-full max-w-[520px] flex-1">
          <h1 className="text-ink mb-4 text-3xl font-bold">{t("title")}</h1>
          <OnboardingDoneCard forceVisible={onboarded} onDismiss={clearOnboardingQuery} />
          {me ? <ProfileCompletenessCard profile={me} /> : null}
          {/* Above the composer: a member who lost a post is here to find it,
              not to write another one. */}
          <div className="mb-4">
            <OutboxTrayHost />
          </div>
          {staleSince ? (
            <p className="text-ink-muted text-small mb-4">
              {tConnection("lastUpdated", {
                when: formatRelativeTime(new Date(staleSince).toISOString(), locale),
              })}
            </p>
          ) : null}
          <div className="mb-4">
            <Composer
              me={me}
              onPosted={(post) => setPosts((prev) => ({ ...prev, posts: [post, ...prev.posts] }))}
            />
          </div>

          {loadingInitial ? (
            <ul className="flex flex-col gap-3" aria-hidden="true">
              {[0, 1, 2, 3].map((i) => (
                <li key={i}>
                  <PostCardSkeleton />
                </li>
              ))}
            </ul>
          ) : showError && posts.posts.length === 0 ? (
            <FeedErrorState
              title={t("errorTitle")}
              body={error ?? t("errorBody")}
              retryLabel={t("retry")}
              onRetry={() => void query.refetch()}
              loading={query.isFetching}
            />
          ) : posts.posts.length === 0 && !error ? (
            <Surface variant="card" padding="0">
              <EmptyState motif="feed" title={t("noResults")} body={t("empty.feed")} />
            </Surface>
          ) : (
            <ul className="flex flex-col gap-3">
              {posts.posts.map((post, i) => (
                <li
                  key={post.id}
                  className="animate-enter-up"
                  style={{ animationDelay: `${staggerDelay(i)}ms` }}
                >
                  <PostCard
                    post={post}
                    onChange={(next) =>
                      setPosts((prev) => ({
                        ...prev,
                        posts: prev.posts.map((item) => (item.id === next.id ? next : item)),
                      }))
                    }
                    onDeleted={(id) =>
                      setPosts((prev) => ({
                        ...prev,
                        posts: prev.posts.filter((item) => item.id !== id),
                      }))
                    }
                  />
                </li>
              ))}
            </ul>
          )}

          {hasMore.posts ? (
            <Button
              type="button"
              onClick={() => setRequestAfter(cursors.posts)}
              disabled={query.isFetching}
              variant="secondary"
              className="self-center"
            >
              {query.isFetching ? t("loadingMore") : t("loadMore")}
            </Button>
          ) : null}

          {showError && posts.posts.length > 0 ? (
            <FeedErrorState
              title={t("errorTitle")}
              body={error ?? t("errorBody")}
              retryLabel={t("retry")}
              onRetry={() => void query.refetch()}
              loading={query.isFetching}
            />
          ) : null}
        </div>
      </Suspense>

      {/* Right Rail */}
      <Suspense fallback={null}>
        <RightRail
          suggestions={suggestions}
          suggestionsLoading={suggestionsLoading}
          suggestionsError={suggestionsError}
          onRetrySuggestions={() => void loadSuggestions()}
          jobs={jobs}
          jobsLoading={jobsLoading}
          jobSuggestionsError={jobsError}
          onRetryJobs={() => void loadRailJobs()}
        />
      </Suspense>
    </main>
  );
}
