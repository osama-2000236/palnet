import { Button, Skeleton, Surface, cx } from "@baydar/ui-web";
import Link from "next/link";
import type { ReactNode } from "react";

export interface ActivityMetric {
  label: string;
  /** Already locale-formatted for display. */
  value: number | string;
  /** Raw count — drives ordering and emphasis; the formatted value cannot,
   *  because "٠" is a non-empty string. */
  count: number;
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

/**
 * Rubric hierarchy 6, and a composition decision rather than a defect fix.
 *
 * `/activity` is the "what needs me" screen, so it should open on what is
 * actionable. It opened on a zero instead: three stat cards of identical
 * visual weight, the first of them (rightmost, so first in RTL) reading
 * "٠ تحديثات غير مقروءة".
 *
 * Two changes, both using surface variants to encode meaning rather than
 * decorating with them — `CLAUDE.md` asks for exactly that, and the page was
 * stacking three different treatments (bare stat cards → bordered list card →
 * bare heading + loose cards) that read as three unrelated decisions:
 *
 *  1. Anything with a count sorts ahead of anything at zero. A zero is still
 *     shown — hiding it would be worse, since "no requests" is information —
 *     but it stops leading, and it renders quiet instead of shouting.
 *  2. The row is ONE `tinted` band of three stats, not three `card` surfaces.
 *     A summary is not three objects of the same rank as the task list below
 *     it; demoting it to a band leaves `card` free to mean "this is the thing
 *     to act on".
 */
export function ActivityMetrics({ metrics }: { metrics: ActivityMetric[] }): JSX.Element {
  const ordered = [...metrics].sort((a, b) => Number(b.count > 0) - Number(a.count > 0));

  return (
    <Surface as="section" variant="tinted" padding="0">
      <ul className="divide-line-soft grid divide-y sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:rtl:divide-x-reverse">
        {ordered.map((metric) => (
          <li key={metric.href}>
            <Link
              href={metric.href}
              className="target-area state-layer flex h-full flex-col justify-center gap-1 rounded-md px-4 py-3 focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]"
            >
              <span className="text-ink-muted text-sm">{metric.label}</span>
              <span
                dir="ltr"
                className={cx(
                  "text-2xl font-bold tabular-nums",
                  // A zero is not news. Keeping it at full weight is what made
                  // the screen open on its least actionable number.
                  metric.count > 0 ? "text-ink" : "text-ink-subtle",
                )}
              >
                {metric.value}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Surface>
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
      {/* Mirrors the shipped metrics band, so the page does not re-flow when
          the real data lands. */}
      <Surface variant="tinted" padding="0">
        <div className="divide-line-soft grid divide-y sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:rtl:divide-x-reverse">
          {[0, 1, 2].map((item) => (
            <div key={item} className="px-4 py-3">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-2 h-7 w-12" />
            </div>
          ))}
        </div>
      </Surface>
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
          className="target-area state-layer border-line-hard bg-surface text-ink inline-flex h-7 items-center justify-center rounded-md border px-2.5 text-[13px] font-semibold focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]"
        >
          {task.cta}
        </Link>
      </div>
    </li>
  );
}
