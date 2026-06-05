// ProfileSkeleton — loading placeholder for profile screens.
// Used while profile data is fetching.
// Mobile twin: packages/ui-native/src/ProfileSkeleton.tsx.
//
// Shapes only — no strings, no icons. Tokens (surface-subtle + line-soft) only.

import { Surface } from "./Surface";

export function ProfileSkeleton(): JSX.Element {
  return (
    <Surface as="section" variant="card" padding="0" className="overflow-hidden" aria-hidden="true">
      {/* Header */}
      <div className="flex items-start gap-4 px-6 py-5">
        <div className="bg-surface-subtle h-12 w-12 shrink-0 animate-pulse rounded-full" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="bg-surface-subtle h-4 w-36 animate-pulse rounded" />
          <div className="bg-surface-subtle h-3 w-28 animate-pulse rounded" />
          <div className="bg-surface-subtle h-3 w-20 animate-pulse rounded" />
        </div>
      </div>

      {/* Bio */}
      <div className="px-6 py-4">
        <div className="bg-surface-subtle h-3 w-[80%] animate-pulse rounded" />
        <div className="bg-surface-subtle mt-2 h-3 w-[60%] animate-pulse rounded" />
        <div className="bg-surface-subtle mt-2 h-3 w-[40%] animate-pulse rounded" />
      </div>

      {/* Stats */}
      <div className="border-line-soft border-t px-6 py-3">
        <div className="flex items-center gap-4">
          <div className="bg-surface-subtle h-9 w-9 animate-pulse rounded-full" />
          <div className="bg-surface-subtle h-3 w-20 animate-pulse rounded" />
          <div className="bg-surface-subtle h-3 w-24 animate-pulse rounded" />
          <div className="flex-1" />
          <div className="bg-surface-subtle h-3 w-20 animate-pulse rounded" />
          <div className="bg-surface-subtle h-3 w-24 animate-pulse rounded" />
        </div>
      </div>

      {/* Tabs */}
      <div className="border-line-soft border-t px-6 py-3">
        <div className="flex items-center gap-2">
          <div className="bg-surface-subtle h-10 w-10 animate-pulse rounded-full" />
          <div className="bg-surface-subtle h-3 w-28 animate-pulse rounded" />
          <div className="bg-surface-subtle h-3 w-28 animate-pulse rounded" />
          <div className="bg-surface-subtle h-3 w-28 animate-pulse rounded" />
        </div>
      </div>
    </Surface>
  );
}
