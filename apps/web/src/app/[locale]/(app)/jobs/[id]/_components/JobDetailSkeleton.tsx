import { Skeleton, Surface } from "@baydar/ui-web";

export function JobDetailSkeleton(): JSX.Element {
  return (
    // `<main>`, because the skeleton replaces the whole page — without it the
    // loading state has no landmark at all. `aria-busy` is what the a11y sweep
    // waits on before scanning; this skeleton set neither, so the sweep scanned
    // the skeleton and reported the *page* as missing a main landmark and an h1.
    <main aria-busy="true" className="mx-auto w-full max-w-[820px] px-4 py-6">
      <Surface variant="card" padding="6" aria-hidden="true">
        <div className="mb-4 flex items-start gap-3">
          <Skeleton radius="var(--radius-md)" className="h-14 w-14" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-[95%]" />
          <Skeleton className="h-3 w-[90%]" />
        </div>
      </Surface>
    </main>
  );
}
