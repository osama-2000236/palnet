import { PostCardSkeleton, Surface } from "@baydar/ui-web";

// Server component — renders during route segment data fetches in (app)/*.
// Mirrors the feed's 3-col grid so the layout doesn't jump when the
// first paint arrives.
export default function AppSegmentLoading(): JSX.Element {
  return (
    <main
      aria-busy="true"
      aria-label="Loading"
      className="mx-auto grid w-full max-w-[1128px] grid-cols-1 items-start gap-6 px-4 py-6 lg:grid-cols-[225px_minmax(0,1fr)] lg:gap-6 lg:px-6 xl:grid-cols-[225px_minmax(0,1fr)_300px]"
    >
      <aside className="hidden flex-col gap-3 lg:flex">
        <Surface variant="hero" padding="0" className="flex flex-col">
          <div className="bg-surface-sunken h-14 animate-pulse" />
          <div className="-mt-7 px-4 pb-4">
            <div className="bg-surface-sunken ring-surface h-14 w-14 animate-pulse rounded-full ring-[3px]" />
            <div className="bg-surface-sunken mt-3 h-4 w-32 animate-pulse rounded" />
            <div className="bg-surface-sunken mt-2 h-3 w-24 animate-pulse rounded" />
          </div>
        </Surface>
      </aside>

      <div className="flex min-w-0 flex-col gap-3">
        <PostCardSkeleton />
        <PostCardSkeleton />
        <PostCardSkeleton />
      </div>

      <aside className="hidden flex-col gap-3 xl:flex">
        <Surface variant="card" padding="4">
          <div className="bg-surface-sunken h-4 w-32 animate-pulse rounded" />
        </Surface>
      </aside>
    </main>
  );
}
