// AppBand — web twin of packages/ui-native/src/AppBand.tsx.
//
// The olive band a page's chrome sits on. Separated from the paper below by
// COLOUR, never elevation: no shadow here, deliberately. See
// handoff/components/AppBand.md.
//
// The one place the twins cannot match: native composes `AppHeader` inside the
// band and passes it `tone="band"`. `ui-web` has no AppHeader — web's chrome is
// `AppShell` — so the title row is inline here. Same anatomy, same prop names.

import type { CSSProperties, JSX, ReactNode } from "react";

import { cx } from "./cx";

export interface AppBandProps {
  title: string;
  subtitle?: string | null;
  leading?: ReactNode;
  trailing?: ReactNode;
  /** SearchField; sits below the title row, inside the band. */
  search?: ReactNode;
  /** Convenience trailing: mono, band-on-muted. Ignored when `trailing` is set. */
  count?: number;
  /** Injected like Tabs' — the twin of native's, so call sites read alike. */
  formatCount?: (n: number) => string;
  /** Extra band content: a metric row, a ScoreBar with `onBand`, a hero block. */
  children?: ReactNode;
  density?: "comfortable" | "compact";
  /** Element for the band. `header` by default. */
  as?: "header" | "div";
  className?: string;
  style?: CSSProperties;
  "data-testid"?: string;
}

export function AppBand({
  title,
  subtitle,
  leading,
  trailing,
  search,
  count,
  formatCount = String,
  children,
  density = "comfortable",
  as: Tag = "header",
  className,
  style,
  "data-testid": testId,
}: AppBandProps): JSX.Element {
  const resolvedTrailing =
    trailing ??
    (count === undefined ? undefined : (
      <span className="text-band-on-muted font-mono text-sm">{formatCount(count)}</span>
    ));

  return (
    <Tag
      data-testid={testId}
      style={style}
      className={cx(
        // No shadow, no border — adding elevation here is the exact thing this
        // redesign removes.
        "bg-band px-4 pt-4",
        density === "compact" ? "pb-2" : "pb-3.5",
        className,
      )}
    >
      <div className="flex min-h-10 items-center gap-3">
        {leading ? <div className="flex items-center justify-center">{leading}</div> : null}
        <div className="min-w-0 flex-1">
          <h1 className="text-band-on truncate text-2xl font-bold">{title}</h1>
          {subtitle ? (
            <p className="text-band-on-muted mt-1 line-clamp-2 text-sm">{subtitle}</p>
          ) : null}
        </div>
        {resolvedTrailing ? (
          <div className="flex items-center justify-center">{resolvedTrailing}</div>
        ) : null}
      </div>
      {search ? <div className="mt-3">{search}</div> : null}
      {children ? <div className="mt-3 flex flex-col gap-2">{children}</div> : null}
    </Tag>
  );
}
