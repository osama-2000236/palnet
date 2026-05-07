// PostCardSkeleton — loading placeholder that mirrors the PostCard layout.
// Spec: Sprint 3 feed polish. Used while the first page of posts is fetching.
// Mobile twin: packages/ui-native/src/PostCardSkeleton.tsx (Sprint 5).
//
// Shapes only — no strings, no icons. Tokens (surface-subtle + line-soft) only.

import { Surface } from "./Surface";

export function PostCardSkeleton(): JSX.Element {
  return (
    <Surface as="article" variant="card" padding="0" className="overflow-hidden" aria-hidden="true">
      {/* Header */}
      <div className="flex items-start gap-3 px-4 pb-2.5 pt-3.5">
        <div className="bg-surface-subtle h-10 w-10 shrink-0 animate-pulse rounded-full" />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="bg-surface-subtle h-3.5 w-32 animate-pulse rounded" />
          <div className="bg-surface-subtle h-3 w-24 animate-pulse rounded" />
          <div className="bg-surface-subtle h-3 w-20 animate-pulse rounded" />
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-col gap-2 px-4 pb-3">
        <div className="bg-surface-subtle h-3.5 w-[92%] animate-pulse rounded" />
        <div className="bg-surface-subtle h-3.5 w-[78%] animate-pulse rounded" />
        <div className="bg-surface-subtle h-3.5 w-[60%] animate-pulse rounded" />
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-2 px-4 py-2.5">
        <div className="bg-surface-subtle h-[18px] w-[18px] animate-pulse rounded-full" />
        <div className="bg-surface-subtle h-3 w-8 animate-pulse rounded" />
        <div className="flex-1" />
        <div className="bg-surface-subtle h-3 w-28 animate-pulse rounded" />
      </div>

      <div className="border-line-soft border-t" />

      {/* Action bar */}
      <div className="flex items-stretch gap-1 p-1">
        <div className="bg-surface-subtle h-9 flex-1 animate-pulse rounded-md" />
        <div className="bg-surface-subtle h-9 flex-1 animate-pulse rounded-md" />
        <div className="bg-surface-subtle h-9 flex-1 animate-pulse rounded-md" />
        <div className="bg-surface-subtle h-9 flex-1 animate-pulse rounded-md" />
      </div>
    </Surface>
  );
}
