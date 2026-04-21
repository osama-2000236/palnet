"use client";

import {
  cursorPage,
  SearchPersonHit as SearchPersonHitSchema,
  type SearchPersonHit,
} from "@palnet/shared";
import { Avatar, Surface } from "@palnet/ui-web";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Suspense, useCallback, useEffect, useState } from "react";

import { apiFetchPage } from "@/lib/api";
import { getAccessToken } from "@/lib/session";

const PeoplePage = cursorPage(SearchPersonHitSchema);

export default function SearchPage(): JSX.Element {
  // Wrap the inner component that calls useSearchParams so Next.js 15 can
  // render this page statically without bailing out to CSR.
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
  const [q, setQ] = useState(initialQ);
  const [hits, setHits] = useState<SearchPersonHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);

  const run = useCallback(
    async (term: string, after: string | null): Promise<void> => {
      if (!term.trim()) {
        setHits([]);
        setHasMore(false);
        setCursor(null);
        return;
      }
      setLoading(true);
      try {
        const token = getAccessToken() ?? undefined;
        const qs = new URLSearchParams({ q: term, limit: "20" });
        if (after) qs.set("after", after);
        const page = await apiFetchPage(
          `/search/people?${qs.toString()}`,
          PeoplePage,
          { token },
        );
        setHits((prev) => (after ? [...prev, ...page.data] : page.data));
        setHasMore(page.meta.hasMore);
        setCursor(page.meta.nextCursor);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (initialQ) void run(initialQ, null);
  }, [initialQ, run]);

  function submit(e: React.FormEvent): void {
    e.preventDefault();
    const url = new URL(window.location.href);
    if (q.trim()) url.searchParams.set("q", q);
    else url.searchParams.delete("q");
    router.replace(url.pathname + url.search);
    void run(q, null);
  }

  return (
    <main className="mx-auto flex w-full max-w-[840px] flex-col gap-4 px-6 py-8">
      <h1 className="text-3xl font-bold text-ink">{t("title")}</h1>

      <form onSubmit={submit} className="flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("placeholder")}
          className="flex-1 rounded-md border border-ink-muted/30 bg-surface px-3 py-2 text-ink"
        />
        <button
          type="submit"
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-ink-inverse"
        >
          {t("submit")}
        </button>
      </form>

      {loading && hits.length === 0 ? (
        <ul className="flex flex-col gap-3" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <li key={i}>
              <PersonHitSkeleton />
            </li>
          ))}
        </ul>
      ) : hits.length === 0 ? (
        <Surface variant="flat" padding="6" className="text-ink-muted">
          {q.trim() ? t("noResults") : t("prompt")}
        </Surface>
      ) : (
        <ul className="flex flex-col gap-3">
          {hits.map((p) => (
            <Surface as="li" key={p.userId} variant="flat" padding="4">
              <Link href={`/in/${p.handle}`} className="flex items-start gap-3">
                <Avatar
                  user={{
                    id: p.userId,
                    handle: p.handle,
                    firstName: p.firstName,
                    lastName: p.lastName,
                    avatarUrl: p.avatarUrl,
                  }}
                  size="lg"
                />
                <div className="flex min-w-0 flex-col">
                  <span className="font-semibold text-ink">
                    {p.firstName} {p.lastName}
                  </span>
                  <span className="text-xs text-ink-muted">/in/{p.handle}</span>
                  {p.headline ? (
                    <span className="mt-1 text-sm text-ink-muted">
                      {p.headline}
                    </span>
                  ) : null}
                  {p.location ? (
                    <span className="text-xs text-ink-muted">{p.location}</span>
                  ) : null}
                </div>
              </Link>
            </Surface>
          ))}
        </ul>
      )}

      {hasMore ? (
        <button
          type="button"
          onClick={() => void run(q, cursor)}
          disabled={loading}
          className="self-center rounded-md border border-ink-muted/30 px-4 py-2 text-sm text-ink hover:bg-ink-muted/5 disabled:opacity-60"
        >
          {loading ? t("loadingMore") : t("loadMore")}
        </button>
      ) : null}
    </main>
  );
}

function PersonHitSkeleton(): JSX.Element {
  return (
    <div className="flex items-start gap-3 rounded-md border border-ink-muted/20 bg-surface p-4">
      <div className="h-14 w-14 animate-pulse rounded-full bg-surface-sunken" />
      <div className="flex flex-1 flex-col gap-2">
        <div className="h-4 w-1/3 animate-pulse rounded bg-surface-sunken" />
        <div className="h-3 w-1/5 animate-pulse rounded bg-surface-sunken" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-surface-sunken" />
      </div>
    </div>
  );
}
