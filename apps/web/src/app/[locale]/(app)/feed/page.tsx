"use client";

import { Suspense, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import { apiFetchPage } from "@/lib/api";
import { getAccessToken } from "@/lib/session";
import { cursorPage, Post as PostSchema } from "@baydar/shared";
import type { Post } from "@baydar/shared";
import { EmptyState, PostCardSkeleton, RetryChip, Surface } from "@baydar/ui-web";
import { PostCard } from "@/components/PostCard";
import { RightRail } from "../components/RightRail";

const PostsPage = cursorPage(PostSchema);

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
  const [posts, setPosts] = useState<HitState>(emptyHits);
  const [cursors, setCursors] = useState<CursorState>(emptyCursor);
  const [hasMore, setHasMore] = useState<MoreState>(emptyMore);
  const [requestAfter, setRequestAfter] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["feed", requestAfter],
    enabled: true,
    queryFn: async () => fetchFeedPage(requestAfter),
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 60 * 1000, // 1 minute
  });

  useEffect(() => {
    if (!query.data) return;
    const page = query.data;
    setError(null);
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

  return (
    <main className="flex min-h-[calc(100vh-4rem)] w-full items-start justify-center gap-8 px-6 py-8">
      {/* Left: Feed */}
      <Suspense fallback={null}>
        <div className="w-full max-w-[520px] flex-1">
          {t("title") === undefined ? null : (
            <h1 className="text-ink mb-4 text-3xl font-bold">{t("title")}</h1>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              // Handle submit via Composer's onSubmit
            }}
            className="mb-4 flex gap-2"
          >
            {/* Composer will handle input and submit */}
          </form>

          {loadingInitial ? (
            <ul className="flex flex-col gap-3" aria-hidden="true">
              {[0, 1, 2, 3].map((i) => (
                <li key={i}>
                  <PostCardSkeleton />
                </li>
              ))}
            </ul>
          ) : showError && posts.posts.length === 0 ? (
            <SearchErrorState
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
              {posts.posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </ul>
          )}

          {hasMore.posts ? (
            <button
              type="button"
              onClick={() => setRequestAfter(cursors.posts)}
              disabled={query.isFetching}
              className="border-ink-muted/30 text-ink hover:bg-ink-muted/5 self-center rounded-md border px-4 py-2 text-sm disabled:opacity-60"
            >
              {query.isFetching ? t("loadingMore") : t("loadMore")}
            </button>
          ) : null}

          {showError && posts.posts.length > 0 ? (
            <SearchErrorState
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
          suggestions={[]}
          suggestionsError={false}
          onRetrySuggestions={() => void query.refetch()}
          jobs={[]}
          jobSuggestionsError={false}
          onRetryJobs={() => void query.refetch()}
        />
      </Suspense>
    </main>
  );
}

async function fetchFeedPage(after: string | null) {
  const token = getAccessToken() ?? undefined;
  const qs = new URLSearchParams({ limit: "20" });
  if (after) qs.set("after", after);
  const path = `/feed?${qs.toString()}`;
  return apiFetchPage(path, PostsPage, { token });
}

function SearchErrorState({
  title,
  body,
  retryLabel,
  onRetry,
  loading,
}: {
  title: string;
  body: string;
  retryLabel: string;
  onRetry: () => void;
  loading: boolean;
}): JSX.Element {
  return (
    <Surface variant="tinted" padding="6" className="flex flex-col items-start gap-2">
      <h2 className="text-ink text-sm font-semibold">{title}</h2>
      <p className="text-ink-muted text-sm">{body}</p>
      <RetryChip onRetry={onRetry} label={retryLabel} loading={loading} />
    </Surface>
  );
}
