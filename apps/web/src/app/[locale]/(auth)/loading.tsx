// Server component — renders during route segment data fetches across
// every (auth) page. Auth shells share the same centred-card layout so a
// single skeleton avoids layout shift when login/register/reset transition
// between each other.
export default function AuthSegmentLoading(): JSX.Element {
  return (
    <main
      aria-busy="true"
      aria-label="Loading"
      className="bg-surface-muted flex min-h-[100dvh] items-center justify-center px-4 py-8"
    >
      <div className="w-full max-w-md">
        <div className="bg-surface ring-line-soft rounded-2xl p-6 ring-1">
          <div className="bg-surface-sunken h-7 w-40 animate-pulse rounded" />
          <div className="bg-surface-sunken mt-2 h-4 w-56 animate-pulse rounded" />
          <div className="mt-6 flex flex-col gap-4">
            <div className="bg-surface-sunken h-11 w-full animate-pulse rounded-md" />
            <div className="bg-surface-sunken h-11 w-full animate-pulse rounded-md" />
            <div className="bg-surface-sunken h-11 w-full animate-pulse rounded-md" />
          </div>
        </div>
      </div>
    </main>
  );
}
