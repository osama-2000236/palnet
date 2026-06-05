// SearchResultSkeleton — loading placeholder for search results.
// Used while search results are fetching.
// Mobile twin: packages/ui-native/src/SearchResultSkeleton.tsx.
//
// Shapes only — no strings, no icons. Tokens (surface-subtle + line-soft) only.

import { Surface } from "./Surface";

export function SearchResultSkeleton(): JSX.Element {
  return (
    <Surface as="section" variant="card" padding="0" className="overflow-hidden" aria-hidden="true">
      {/* List of 3 result rows */}
      <div className="space-y-3 px-4 py-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-start gap-4">
            <div className="bg-surface-subtle h-10 w-10 shrink-0 animate-pulse rounded-full" />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <div className="bg-surface-subtle h-4 w-[60%] animate-pulse rounded" />
              <div className="bg-surface-subtle mt-2 h-3 w-[48%] animate-pulse rounded" />
              <div className="bg-surface-subtle mt-2 h-3 w-[36%] animate-pulse rounded" />
            </div>
          </div>
        ))}
      </div>
    </Surface>
  );
}
