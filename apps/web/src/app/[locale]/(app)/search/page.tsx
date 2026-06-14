"use client";

import {
  SearchCompanyHit as SearchCompanyHitSchema,
  cursorPage,
  SearchJobHit as SearchJobHitSchema,
  SearchPersonHit as SearchPersonHitSchema,
  SearchPostHit as SearchPostHitSchema,
  type SearchCompanyHit,
  type SearchJobHit,
  type SearchPersonHit,
  type SearchPostHit,
} from "@baydar/shared";
import { Button, EmptyState, Input, Surface, Tab, Tabs } from "@baydar/ui-web";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Suspense, useEffect, useMemo, useState } from "react";

import { apiFetchPage } from "@/lib/api";
import { getAccessToken } from "@/lib/session";
import {
  CompanyRow,
  JobRow,
  PeopleRow,
  PostRow,
  SearchErrorState,
  SearchHitSkeleton,
} from "./_components/SearchResults";

const PeoplePage = cursorPage(SearchPersonHitSchema);
const PostsPage = cursorPage(SearchPostHitSchema);
const JobsPage = cursorPage(SearchJobHitSchema);
const CompaniesPage = cursorPage(SearchCompanyHitSchema);

type SearchType = "people" | "posts" | "jobs" | "companies";
type HitState = {
  people: SearchPersonHit[];
  posts: SearchPostHit[];
  jobs: SearchJobHit[];
  companies: SearchCompanyHit[];
};
type CursorState = Record<SearchType, string | null>;
type MoreState = Record<SearchType, boolean>;

const searchTypes: SearchType[] = ["people", "posts", "jobs", "companies"];
const emptyHits: HitState = { people: [], posts: [], jobs: [], companies: [] };
const emptyCursor: CursorState = { people: null, posts: null, jobs: null, companies: null };
const emptyMore: MoreState = { people: false, posts: false, jobs: false, companies: false };

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
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("placeholder")}
          fullWidth
          aria-label={t("placeholder")}
        />
        <Button type="submit" variant="primary">
          {t("submit")}
        </Button>
      </form>

      <Tabs value={type} onChange={(next) => selectType(next as SearchType)} label={t("title")}>
        {tabs.map((tab) => (
          <Tab key={tab.key} value={tab.key}>
            {tab.label}
          </Tab>
        ))}
      </Tabs>

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
          {type === "people"
            ? hits.people.map((p, i) => <PeopleRow key={p.userId} item={p} index={i} />)
            : null}
          {type === "posts"
            ? hits.posts.map((p, i) => <PostRow key={p.id} item={p} index={i} />)
            : null}
          {type === "jobs"
            ? hits.jobs.map((j, i) => <JobRow key={j.id} item={j} index={i} />)
            : null}
          {type === "companies"
            ? hits.companies.map((c, i) => <CompanyRow key={c.id} item={c} index={i} />)
            : null}
        </ul>
      )}

      {hasMore[type] ? (
        <Button
          type="button"
          onClick={() => setRequestAfter(cursors[type])}
          disabled={query.isFetching}
          variant="secondary"
          className="self-center"
        >
          {query.isFetching ? t("loadingMore") : t("loadMore")}
        </Button>
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
  if (type === "jobs") return apiFetchPage(path, JobsPage, { token });
  return apiFetchPage(path, CompaniesPage, { token });
}

function parseSearchType(value: string | null | undefined): SearchType {
  return value === "posts" || value === "jobs" || value === "companies" ? value : "people";
}
