// Loading skeleton for every authenticated route in /(app)/*.
//
// Next.js App Router renders this file via React Suspense whenever a route
// in this segment is being prepared. It sits above each page's own
// in-component loading branch (`firstLoad ? <Skeleton /> : ...`) and covers
// the gap that today shows a blank page between layout mount and first
// useEffect fetch.
//
// The skeleton mirrors the 3-column feed shape — the most common landing —
// so it reads as a generic "an app screen is loading" rather than implying
// any specific route is being fetched.
//
// Tokens only — no fetches, no translations, no router access.

import type { JSX } from "react";

export default function AppLoading(): JSX.Element {
  return (
    <main
      aria-busy="true"
      aria-label="Loading"
      className="mx-auto grid w-full max-w-[1128px] grid-cols-1 items-start gap-6 px-4 py-6 lg:grid-cols-[225px_minmax(0,1fr)] lg:gap-6 lg:px-6 xl:grid-cols-[225px_minmax(0,1fr)_300px]"
    >
      {/* Left rail — mini profile */}
      <aside className="hidden flex-col gap-3 lg:flex">
        <div className="border-line-soft bg-surface shadow-card overflow-hidden rounded-xl border">
          <div className="bg-surface-sunken h-14 animate-pulse" />
          <div className="-mt-7 px-4 pb-4">
            <div className="bg-surface-sunken ring-surface h-14 w-14 animate-pulse rounded-full ring-[3px]" />
            <div className="bg-surface-sunken mt-3 h-4 w-32 animate-pulse rounded" />
            <div className="bg-surface-sunken mt-2 h-3 w-24 animate-pulse rounded" />
          </div>
          <div className="border-line-soft border-t" />
          <div className="flex items-center justify-between px-4 py-2.5">
            <div className="bg-surface-sunken h-3 w-20 animate-pulse rounded" />
            <div className="bg-surface-sunken h-3 w-6 animate-pulse rounded" />
          </div>
        </div>
      </aside>

      {/* Center — 3 generic post placeholders */}
      <div className="flex min-w-0 flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <article
            key={i}
            aria-hidden="true"
            className="border-line-soft bg-surface shadow-card overflow-hidden rounded-lg border"
          >
            <div className="flex items-start gap-3 px-4 pb-2.5 pt-3.5">
              <div className="bg-surface-subtle h-10 w-10 shrink-0 animate-pulse rounded-full" />
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <div className="bg-surface-subtle h-3.5 w-32 animate-pulse rounded" />
                <div className="bg-surface-subtle h-3 w-24 animate-pulse rounded" />
              </div>
            </div>
            <div className="flex flex-col gap-2 px-4 pb-3">
              <div className="bg-surface-subtle h-3.5 w-[92%] animate-pulse rounded" />
              <div className="bg-surface-subtle h-3.5 w-[78%] animate-pulse rounded" />
              <div className="bg-surface-subtle h-3.5 w-[60%] animate-pulse rounded" />
            </div>
            <div className="border-line-soft border-t" />
            <div className="flex items-stretch gap-1 p-1">
              <div className="bg-surface-subtle h-9 flex-1 animate-pulse rounded-md" />
              <div className="bg-surface-subtle h-9 flex-1 animate-pulse rounded-md" />
              <div className="bg-surface-subtle h-9 flex-1 animate-pulse rounded-md" />
              <div className="bg-surface-subtle h-9 flex-1 animate-pulse rounded-md" />
            </div>
          </article>
        ))}
      </div>

      {/* Right rail — PYMK placeholder */}
      <aside className="hidden flex-col gap-3 xl:flex">
        <div className="border-line-soft bg-surface shadow-card rounded-lg border">
          <div className="px-4 pt-3">
            <div className="bg-surface-subtle h-3.5 w-32 animate-pulse rounded" />
          </div>
          <ul className="flex flex-col">
            {[0, 1, 2].map((i) => (
              <li
                key={i}
                className="border-line-soft flex items-start gap-2.5 border-t px-4 py-3 first:border-t-0"
              >
                <div className="bg-surface-subtle h-9 w-9 shrink-0 animate-pulse rounded-full" />
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <div className="bg-surface-subtle h-3.5 w-28 animate-pulse rounded" />
                  <div className="bg-surface-subtle h-3 w-20 animate-pulse rounded" />
                </div>
                <div className="bg-surface-subtle h-6 w-16 shrink-0 animate-pulse rounded-full" />
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </main>
  );
}
