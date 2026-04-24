// ProfilePageSkeleton — matches the /in/[handle] layout while the profile
// is fetching. Spec: Sprint 9 skeletons. Shapes only; no strings, no icons.
//
// Mirror the real page's composition so the swap-in doesn't cause layout
// shift: cover banner → hero (avatar + name/headline block + actions) →
// two stacked sections for "about" + "experience" placeholders.

import { Surface } from "./Surface";

export function ProfilePageSkeleton(): JSX.Element {
  return (
    <main className="mx-auto flex w-full max-w-[840px] flex-col gap-6 px-6 py-8" aria-hidden="true">
      {/* Cover */}
      <div className="bg-surface-subtle h-40 w-full animate-pulse rounded-lg sm:h-52" />

      {/* Hero: avatar + name block + action */}
      <Surface as="section" variant="hero" padding="6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="bg-surface-subtle h-20 w-20 shrink-0 animate-pulse rounded-full" />
            <div className="flex min-w-0 flex-col gap-2">
              <div className="bg-surface-subtle h-7 w-48 animate-pulse rounded" />
              <div className="bg-surface-subtle h-4 w-64 animate-pulse rounded" />
              <div className="bg-surface-subtle h-3.5 w-32 animate-pulse rounded" />
              <div className="bg-surface-subtle h-3 w-24 animate-pulse rounded" />
            </div>
          </div>
          <div className="bg-surface-subtle h-9 w-28 animate-pulse rounded-md" />
        </div>
      </Surface>

      {/* About */}
      <Surface as="section" variant="card" padding="6">
        <div className="flex flex-col gap-2">
          <div className="bg-surface-subtle mb-1 h-5 w-24 animate-pulse rounded" />
          <div className="bg-surface-subtle h-3.5 w-[94%] animate-pulse rounded" />
          <div className="bg-surface-subtle h-3.5 w-[88%] animate-pulse rounded" />
          <div className="bg-surface-subtle h-3.5 w-[72%] animate-pulse rounded" />
        </div>
      </Surface>

      {/* Experience */}
      <Surface as="section" variant="card" padding="6">
        <div className="bg-surface-subtle mb-4 h-5 w-32 animate-pulse rounded" />
        <div className="flex flex-col gap-4">
          {[0, 1].map((i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="bg-surface-subtle h-10 w-10 shrink-0 animate-pulse rounded-md" />
              <div className="flex flex-1 flex-col gap-1.5">
                <div className="bg-surface-subtle h-4 w-44 animate-pulse rounded" />
                <div className="bg-surface-subtle h-3.5 w-32 animate-pulse rounded" />
                <div className="bg-surface-subtle h-3 w-24 animate-pulse rounded" />
              </div>
            </div>
          ))}
        </div>
      </Surface>
    </main>
  );
}
