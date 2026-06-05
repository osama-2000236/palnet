import { Skeleton, Surface } from "@baydar/ui-web";

export function ChannelHeader({ label }: { label: string }): JSX.Element {
  return (
    <span className="text-ink-subtle text-center font-sans text-[11px] font-semibold uppercase tracking-wider">
      {label}
    </span>
  );
}

export function PrefsSkeleton(): JSX.Element {
  return (
    <div className="flex flex-col gap-4" aria-hidden="true">
      {[0, 1, 2].map((group) => (
        <Surface key={group} variant="card" padding="0">
          <div className="px-4 py-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="mt-2 h-3 w-48" />
          </div>
          <div className="border-line-soft border-t" />
          <ul>
            {[0, 1, 2].map((item) => (
              <li
                key={item}
                className={
                  "grid grid-cols-[1fr_72px_72px] items-center gap-4 px-4 py-3" +
                  (item > 0 ? " border-line-soft border-t" : "")
                }
              >
                <div className="flex flex-col gap-1.5">
                  <Skeleton className="h-3.5 w-36" />
                  <Skeleton className="h-3 w-52" />
                </div>
                <Skeleton kind="pill" className="h-5 w-9 justify-self-center" />
                <Skeleton kind="pill" className="h-5 w-9 justify-self-center" />
              </li>
            ))}
          </ul>
        </Surface>
      ))}
    </div>
  );
}
