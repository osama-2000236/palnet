import { Skeleton, Surface } from "@baydar/ui-web";

export function ChannelHeader({ label }: { label: string }): JSX.Element {
  return (
    <span className="text-micro text-ink-subtle text-center font-sans font-semibold uppercase tracking-wider">
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
                {/* `min-w-0` + capped widths, not fixed ones. The grid is
                    `[1fr 72px 72px]` with `gap-4` and `px-4`, which leaves
                    182px for the label column at 390px — and a fixed `w-52`
                    (208px) child forces the `1fr` track wider, taking the
                    whole page to 407px. The loaded state never showed it
                    because real text wraps; only the skeleton overflowed, so
                    it was invisible to any check that waits for skeletons to
                    clear before measuring. */}
                <div className="flex min-w-0 flex-col gap-1.5">
                  <Skeleton className="h-3.5 w-full max-w-[9rem]" />
                  <Skeleton className="h-3 w-full max-w-[13rem]" />
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
