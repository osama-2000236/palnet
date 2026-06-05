// Server component — renders during route segment data fetches across
// every (auth) page. Auth shells share the same centred-card layout so a
// single skeleton avoids layout shift when login/register/reset transition
// between each other.
import { Skeleton } from "@baydar/ui-web";

export default function AuthSegmentLoading(): JSX.Element {
  return (
    <main
      aria-busy="true"
      aria-label="Loading"
      className="bg-surface-muted flex min-h-[100dvh] items-center justify-center px-4 py-8"
    >
      <div className="w-full max-w-md">
        <div className="bg-surface ring-line-soft rounded-2xl p-6 ring-1">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="mt-2 h-4 w-56" />
          <div className="mt-6 flex flex-col gap-4">
            <Skeleton radius="var(--radius-md)" className="h-11 w-full" />
            <Skeleton radius="var(--radius-md)" className="h-11 w-full" />
            <Skeleton radius="var(--radius-md)" className="h-11 w-full" />
          </div>
        </div>
      </div>
    </main>
  );
}
