import type { JSX } from "react";

import { Skeleton } from "@baydar/ui-web";
import { getTranslations } from "next-intl/server";

export default async function AppLoading(): Promise<JSX.Element> {
  const t = await getTranslations("common");
  return (
    <main
      aria-busy="true"
      aria-label={t("loading")}
      className="bg-surface-muted mx-auto grid min-h-screen w-full max-w-[1128px] grid-cols-1 items-start gap-6 px-4 py-6 lg:grid-cols-[225px_minmax(0,1fr)] lg:gap-6 lg:px-6 xl:grid-cols-[225px_minmax(0,1fr)_300px]"
    >
      <aside className="hidden flex-col gap-3 lg:flex">
        <div className="border-line-soft bg-surface shadow-card overflow-hidden rounded-xl border">
          <Skeleton className="h-14 w-full" />
          <div className="-mt-7 px-4 pb-4">
            <Skeleton kind="circle" className="ring-surface h-14 w-14 ring-[3px]" />
            <Skeleton className="mt-3 h-4 w-32" />
            <Skeleton className="mt-2 h-3 w-24" />
          </div>
          <div className="border-line-soft border-t" />
          <div className="flex items-center justify-between px-4 py-2.5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-6" />
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <article
            key={i}
            aria-hidden="true"
            className="border-line-soft bg-surface shadow-card overflow-hidden rounded-lg border"
          >
            <div className="flex items-start gap-3 px-4 pb-2.5 pt-3.5">
              <Skeleton kind="circle" className="bg-surface-subtle h-10 w-10 shrink-0" />
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <Skeleton className="bg-surface-subtle h-3.5 w-32" />
                <Skeleton className="bg-surface-subtle h-3 w-24" />
              </div>
            </div>
            <div className="flex flex-col gap-2 px-4 pb-3">
              <Skeleton className="bg-surface-subtle h-3.5 w-[92%]" />
              <Skeleton className="bg-surface-subtle h-3.5 w-[78%]" />
              <Skeleton className="bg-surface-subtle h-3.5 w-[60%]" />
            </div>
            <div className="border-line-soft border-t" />
            <div className="flex items-stretch gap-1 p-1">
              <Skeleton radius="var(--radius-md)" className="bg-surface-subtle h-9 flex-1" />
              <Skeleton radius="var(--radius-md)" className="bg-surface-subtle h-9 flex-1" />
              <Skeleton radius="var(--radius-md)" className="bg-surface-subtle h-9 flex-1" />
              <Skeleton radius="var(--radius-md)" className="bg-surface-subtle h-9 flex-1" />
            </div>
          </article>
        ))}
      </div>

      <aside className="hidden flex-col gap-3 xl:flex">
        <div className="border-line-soft bg-surface shadow-card rounded-lg border">
          <div className="px-4 pt-3">
            <Skeleton className="bg-surface-subtle h-3.5 w-32" />
          </div>
          <ul className="flex flex-col">
            {[0, 1, 2].map((i) => (
              <li
                key={i}
                className="border-line-soft flex items-start gap-2.5 border-t px-4 py-3 first:border-t-0"
              >
                <Skeleton kind="circle" className="bg-surface-subtle h-9 w-9 shrink-0" />
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <Skeleton className="bg-surface-subtle h-3.5 w-28" />
                  <Skeleton className="bg-surface-subtle h-3 w-20" />
                </div>
                <Skeleton kind="pill" className="bg-surface-subtle h-6 w-16 shrink-0" />
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </main>
  );
}
