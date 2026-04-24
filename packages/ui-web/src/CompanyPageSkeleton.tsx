// CompanyPageSkeleton — matches /companies/[slug] while the company is
// fetching. Spec: Sprint 9 skeletons. Shapes only, no strings.
//
// Layout mirror: cover banner → hero (logo + name/industry/tagline) → two
// card surfaces standing in for "about" and "open jobs".

import { Surface } from "./Surface";

export function CompanyPageSkeleton(): JSX.Element {
  return (
    <main className="mx-auto flex w-full max-w-[960px] flex-col gap-4 px-4 py-6" aria-hidden="true">
      {/* Cover */}
      <div className="border-line-soft bg-surface-subtle h-44 w-full animate-pulse rounded-xl border md:h-56" />

      {/* Hero: logo + name block + action */}
      <Surface as="section" variant="hero" padding="6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="bg-surface-subtle h-16 w-16 shrink-0 animate-pulse rounded-md" />
            <div className="flex min-w-0 flex-col gap-2">
              <div className="bg-surface-subtle h-6 w-56 animate-pulse rounded" />
              <div className="bg-surface-subtle h-3.5 w-40 animate-pulse rounded" />
              <div className="bg-surface-subtle h-3 w-28 animate-pulse rounded" />
            </div>
          </div>
          <div className="bg-surface-subtle h-9 w-24 animate-pulse rounded-md" />
        </div>
      </Surface>

      {/* About */}
      <Surface as="section" variant="card" padding="6">
        <div className="flex flex-col gap-2">
          <div className="bg-surface-subtle mb-1 h-5 w-28 animate-pulse rounded" />
          <div className="bg-surface-subtle h-3.5 w-[94%] animate-pulse rounded" />
          <div className="bg-surface-subtle h-3.5 w-[84%] animate-pulse rounded" />
          <div className="bg-surface-subtle h-3.5 w-[66%] animate-pulse rounded" />
        </div>
      </Surface>

      {/* Jobs list */}
      <Surface as="section" variant="card" padding="6">
        <div className="bg-surface-subtle mb-4 h-5 w-32 animate-pulse rounded" />
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="border-line-soft flex items-start gap-3 rounded-md border p-3">
              <div className="bg-surface-subtle h-10 w-10 shrink-0 animate-pulse rounded-md" />
              <div className="flex flex-1 flex-col gap-1.5">
                <div className="bg-surface-subtle h-4 w-52 animate-pulse rounded" />
                <div className="bg-surface-subtle h-3 w-32 animate-pulse rounded" />
                <div className="bg-surface-subtle h-3 w-20 animate-pulse rounded" />
              </div>
            </div>
          ))}
        </div>
      </Surface>
    </main>
  );
}
