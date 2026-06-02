"use client";

import {
  cursorPage,
  SearchJobHit as SearchJobHitSchema,
  SearchPersonHit as SearchPersonHitSchema,
  SearchPostHit as SearchPostHitSchema,
  type SearchJobHit,
  type SearchPersonHit,
  type SearchPostHit,
} from "@baydar/shared";
import { Avatar, EmptyState, RetryChip, Surface } from "@baydar/ui-web";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Suspense, useEffect, useMemo, useState } from "react";

import { apiFetchPage } from "@/lib/api";
import { getAccessToken } from "@/lib/session";

const PeoplePage = cursorPage(SearchPersonHitSchema);
const PostsPage = cursorPage(SearchPostHitSchema);
const JobsPage = cursorPage(SearchJobHitSchema);

type SearchType = "people" | "posts" | "jobs";
type HitState = {
  people: SearchPersonHit[];
  posts: SearchPostHit[];
  jobs: SearchJobHit[];
};
type CursorState = Record<SearchType, string | null>;
type MoreState = Record<SearchType, boolean>;

const searchTypes: SearchType[] = ["people", "posts", "jobs"];
const emptyHits: HitState = { people: [], posts: [], jobs: [] };
const emptyCursor: CursorState = { people: null, posts: null, jobs: null };
const emptyMore: MoreState = { people: false, posts: false, jobs: false };

export default function SearchPage(): JSX.Element {
  return (
    <Suspense fallback={null}>
      <SearchInner />
    </Suspense>
  );
}

function SearchInner(): JSX.Element {
  const t = useTranslations("search");
  const router = useRouter();
  const params = useSearchParams();
  const initialQ = params?.get("q") ?? "";
  const initialType = parseSearchType(params?.get("type"));
  const [q, setQ] = useState(initialQ);
  const [term, setTerm] = useState(initialQ.trim());
  const [type, setType] = useState<SearchType>(initialType);
  const [hits, setHits] = useState<HitState>(emptyHits);
  const [cursors, setCursors] = useState<CursorState>(emptyCursor);
  const [hasMore, setHasMore] = useState<MoreState>(emptyMore);
  const [requestAfter, setRequestAfter] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["search", type, term, requestAfter],
    enabled: term.length > 0,
    queryFn: async () => fetchSearchPage(type, term, requestAfter),
    retry: false,
    staleTime: 0,
    gcTime: 60 * 1000,
  });

  useEffect(() => {
    if (!query.data) return;
    const page = query.data;
    setError(null);
    setHits((prev) => ({
      ...prev,
      [type]: requestAfter ? [...prev[type], ...page.data] : page.data,
    }));
    setCursors((prev) => ({ ...prev, [type]: page.meta.nextCursor }));
    setHasMore((prev) => ({ ...prev, [type]: page.meta.hasMore }));
  }, [query.data, requestAfter, type]);

  useEffect(() => {
    if (!query.isError) return;
    setError(t("errorBody"));
    if (!requestAfter) {
      setHits((prev) => ({ ...prev, [type]: [] }));
      setCursors((prev) => ({ ...prev, [type]: null }));
      setHasMore((prev) => ({ ...prev, [type]: false }));
    }
  }, [query.isError, requestAfter, t, type]);

  const tabs = useMemo(
    () =>
      searchTypes.map((key) => ({
        key,
        label: t(`tabs.${key}`),
      })),
    [t],
  );

  function updateUrl(nextType: SearchType, nextTerm: string): void {
    const url = new URL(window.location.href);
    if (nextTerm) url.searchParams.set("q", nextTerm);
    else url.searchParams.delete("q");
    if (nextType === "people") url.searchParams.delete("type");
    else url.searchParams.set("type", nextType);
    router.replace(url.pathname + url.search);
  }

  function submit(e: React.FormEvent): void {
    e.preventDefault();
    const nextTerm = q.trim();
    setTerm(nextTerm);
    setHits(emptyHits);
    setCursors(emptyCursor);
    setHasMore(emptyMore);
    setRequestAfter(null);
    setError(null);
    updateUrl(type, nextTerm);
  }

  function selectType(nextType: SearchType): void {
    setType(nextType);
    setRequestAfter(null);
    setError(null);
    updateUrl(nextType, term);
  }

  const loadingInitial = query.isFetching && hits[type].length === 0 && !error;
  const showPrompt = !term;
  const showError = Boolean(error) && term.length > 0 && !query.isFetching;

  return (
    <main className="mx-auto flex w-full max-w-[840px] flex-col gap-4 px-6 py-8">
      <h1 className="text-ink text-3xl font-bold">{t("title")}</h1>

      <form onSubmit={submit} className="flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("placeholder")}
          className="border-ink-muted/30 bg-surface text-ink flex-1 rounded-md border px-3 py-2"
        />
        <button
          type="submit"
          className="bg-brand-600 text-ink-inverse rounded-md px-4 py-2 text-sm font-semibold"
        >
          {t("submit")}
        </button>
      </form>

      <div className="flex gap-2" role="tablist" aria-label={t("title")}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={tab.key === type}
            onClick={() => selectType(tab.key)}
            className={
              tab.key === type
                ? "bg-brand-600 text-ink-inverse rounded-md px-4 py-2 text-sm font-semibold"
                : "border-ink-muted/30 text-ink rounded-md border px-4 py-2 text-sm font-semibold"
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loadingInitial ? (
        <ul className="flex flex-col gap-3" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <li key={i}>
              <SearchHitSkeleton />
            </li>
          ))}
        </ul>
      ) : showError && hits[type].length === 0 ? (
        <SearchErrorState
          title={t("errorTitle")}
          body={error ?? t("errorBody")}
          retryLabel={t("retry")}
          onRetry={() => void query.refetch()}
          loading={query.isFetching}
        />
      ) : showPrompt ? (
        <Surface variant="card" padding="0">
          <EmptyState motif="search" title={t("noResults")} body={t("prompt")} />
        </Surface>
      ) : hits[type].length === 0 && !error ? (
        <Surface variant="card" padding="0">
          <EmptyState motif="search" title={t("noResults")} body={t(`empty.${type}`)} />
        </Surface>
      ) : (
        <ul className="flex flex-col gap-3">
          {type === "people" ? hits.people.map((p) => <PeopleRow key={p.userId} item={p} />) : null}
          {type === "posts" ? hits.posts.map((p) => <PostRow key={p.id} item={p} />) : null}
          {type === "jobs" ? hits.jobs.map((j) => <JobRow key={j.id} item={j} />) : null}
        </ul>
      )}

      {hasMore[type] ? (
        <button
          type="button"
          onClick={() => setRequestAfter(cursors[type])}
          disabled={query.isFetching}
          className="border-ink-muted/30 text-ink hover:bg-ink-muted/5 self-center rounded-md border px-4 py-2 text-sm disabled:opacity-60"
        >
          {query.isFetching ? t("loadingMore") : t("loadMore")}
        </button>
      ) : null}

      {showError && hits[type].length > 0 ? (
        <SearchErrorState
          title={t("errorTitle")}
          body={error ?? t("errorBody")}
          retryLabel={t("retry")}
          onRetry={() => void query.refetch()}
          loading={query.isFetching}
        />
      ) : null}
    </main>
  );
}

async function fetchSearchPage(type: SearchType, term: string, after: string | null) {
  const token = getAccessToken() ?? undefined;
  const qs = new URLSearchParams({ q: term, limit: "20" });
  if (after) qs.set("after", after);
  const path = `/search/${type}?${qs.toString()}`;
  if (type === "people") return apiFetchPage(path, PeoplePage, { token });
  if (type === "posts") return apiFetchPage(path, PostsPage, { token });
  return apiFetchPage(path, JobsPage, { token });
}

function parseSearchType(value: string | null | undefined): SearchType {
  return value === "posts" || value === "jobs" ? value : "people";
}

function PeopleRow({ item }: { item: SearchPersonHit }): JSX.Element {
  return (
    <Surface as="li" variant="flat" padding="4">
      <Link href={`/in/${item.handle}`} className="flex items-start gap-3">
        <Avatar
          user={{
            id: item.userId,
            handle: item.handle,
            firstName: item.firstName,
            lastName: item.lastName,
            avatarUrl: item.avatarUrl,
          }}
          size="lg"
        />
        <div className="flex min-w-0 flex-col">
          <span className="text-ink font-semibold">
            {item.firstName} {item.lastName}
          </span>
          <span className="text-ink-muted text-xs">/in/{item.handle}</span>
          {item.headline ? (
            <span className="text-ink-muted mt-1 text-sm">{item.headline}</span>
          ) : null}
          {item.location ? <span className="text-ink-muted text-xs">{item.location}</span> : null}
        </div>
      </Link>
    </Surface>
  );
}

function PostRow({ item }: { item: SearchPostHit }): JSX.Element {
  return (
    <Surface as="li" variant="flat" padding="4">
      <Link href={`/in/${item.authorHandle}`} className="flex items-start gap-3">
        <Avatar
          user={{
            id: item.authorId,
            handle: item.authorHandle,
            firstName: item.authorDisplayName,
            lastName: "",
            avatarUrl: item.authorAvatarUrl,
          }}
          size="md"
        />
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-ink font-semibold">{item.authorDisplayName}</span>
          <span className="text-ink-muted text-sm">{item.bodyExcerpt}</span>
          <span className="text-ink-muted text-xs">
            {new Date(item.createdAt).toLocaleDateString()}
          </span>
        </div>
      </Link>
    </Surface>
  );
}

function JobRow({ item }: { item: SearchJobHit }): JSX.Element {
  const location = [item.city, item.country].filter(Boolean).join(", ");
  return (
    <Surface as="li" variant="flat" padding="4">
      <Link href={`/jobs/${item.id}`} className="flex items-start gap-3">
        <div className="bg-surface-sunken text-ink flex h-12 w-12 shrink-0 items-center justify-center rounded-md text-sm font-bold">
          {item.companyName.slice(0, 1)}
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-ink font-semibold">{item.title}</span>
          <span className="text-ink-muted text-sm">{item.companyName}</span>
          <span className="text-ink-muted text-xs">
            {[location, item.locationMode, item.type].filter(Boolean).join(" · ")}
          </span>
        </div>
      </Link>
    </Surface>
  );
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

function SearchHitSkeleton(): JSX.Element {
  return (
    <div className="border-ink-muted/20 bg-surface flex items-start gap-3 rounded-md border p-4">
      <div className="bg-surface-sunken h-14 w-14 animate-pulse rounded-full" />
      <div className="flex flex-1 flex-col gap-2">
        <div className="bg-surface-sunken h-4 w-1/3 animate-pulse rounded" />
        <div className="bg-surface-sunken h-3 w-1/5 animate-pulse rounded" />
        <div className="bg-surface-sunken h-3 w-2/3 animate-pulse rounded" />
      </div>
    </div>
  );
}
