import { Button, Skeleton, Surface } from "@baydar/ui-web";
import Link from "next/link";
import type { ReactNode } from "react";

export interface ActivityMetric {
  label: string;
  value: number | string;
  href: string;
}

export interface ActivityTask {
  id: string;
  title: string;
  body: string;
  href: string;
  cta: string;
  tone?: "default" | "warning";
}

export function ActivityMetrics({ metrics }: { metrics: ActivityMetric[] }): JSX.Element {
  return (
    <section className="grid gap-3 sm:grid-cols-3">
      {metrics.map((metric) => (
        <Link
          key={metric.href}
          href={metric.href}
          className="rounded-md focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]"
        >
          <Surface variant="card" padding="4" className="h-full">
            <p className="text-ink-muted text-sm">{metric.label}</p>
            <p className="text-ink mt-2 text-3xl font-bold" dir="ltr">
              {metric.value}
            </p>
          </Surface>
        </Link>
      ))}
    </section>
  );
}

export function ActivityTaskList({
  title,
  empty,
  tasks,
}: {
  title: string;
  empty: string;
  tasks: ActivityTask[];
}): JSX.Element {
  return (
    <Surface variant="card" padding="0">
      <div className="border-line-soft border-b px-4 py-3">
        <h2 className="text-ink text-base font-semibold">{title}</h2>
      </div>
      {tasks.length === 0 ? (
        <p className="text-ink-muted px-4 py-6 text-sm">{empty}</p>
      ) : (
        <ul className="divide-line-soft divide-y">
          {tasks.map((task) => (
            <ActivityTaskRow key={task.id} task={task} />
          ))}
        </ul>
      )}
    </Surface>
  );
}

export function ActivitySkeleton(): JSX.Element {
  return (
    <div className="flex flex-col gap-4" aria-hidden="true">
      <section className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <Surface key={item} variant="card" padding="4">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-3 h-8 w-12" />
          </Surface>
        ))}
      </section>
      <Surface variant="card" padding="4">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="mt-4 h-16 w-full" />
        <Skeleton className="mt-3 h-16 w-full" />
      </Surface>
    </div>
  );
}

export function ActivityError({
  title,
  body,
  retryLabel,
  onRetry,
}: {
  title: string;
  body: string;
  retryLabel: string;
  onRetry(): void;
}): JSX.Element {
  return (
    <Surface variant="card" padding="5" className="flex flex-col gap-3">
      <h2 className="text-ink text-lg font-semibold">{title}</h2>
      <p className="text-ink-muted text-sm">{body}</p>
      <Button variant="secondary" size="sm" className="self-start" onClick={onRetry}>
        {retryLabel}
      </Button>
    </Surface>
  );
}

export function ActivitySection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}): JSX.Element {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-ink text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function ActivityTaskRow({ task }: { task: ActivityTask }): JSX.Element {
  return (
    <li className={task.tone === "warning" ? "bg-[var(--warning-soft)]" : undefined}>
      <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-4">
        <div className="min-w-0 flex-1">
          <p className="text-ink text-sm font-semibold">{task.title}</p>
          <p className="text-ink-muted mt-1 text-sm">{task.body}</p>
        </div>
        <Link
          href={task.href}
          className="border-line-hard bg-surface text-ink hover:bg-surface-subtle inline-flex h-7 items-center justify-center rounded-md border px-2.5 text-[13px] font-semibold focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]"
        >
          {task.cta}
        </Link>
      </div>
    </li>
  );
}
