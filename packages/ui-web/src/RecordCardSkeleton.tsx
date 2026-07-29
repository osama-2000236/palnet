// RecordCardSkeleton — web twin of packages/ui-native/src/RecordCardSkeleton.tsx.
//
// The loading shape for a RecordCard. Four web files had their own
// (`JobRowSkeleton`, `ConnectionRowSkeleton`, `NotificationRowSkeleton`,
// `RailRowsSkeleton`), and the text bars had drifted to four different widths.
//
// `leading` and `trailing` are slots rather than a shape enum, and they are the
// same two slots RecordCard takes. A jobs row loads a square company logo, a
// connection row loads a round avatar and a button — a skeleton that flattened
// those into one shape would be lying about what is arriving. What is worth
// unifying is the text block, and that is what this fixes.
//
// Native's twin takes no slots because it is used one way there; if a second
// shape ever appears on mobile, these are the props to copy.

import type { CSSProperties, ElementType, JSX, ReactNode } from "react";

import { cx } from "./cx";
import { Skeleton } from "./Skeleton";
import { Surface } from "./Surface";

export interface RecordCardSkeletonProps {
  /** Defaults to a 48px square — a logo or thumbnail. Pass a circle for people. */
  leading?: ReactNode;
  trailing?: ReactNode;
  /** The meta line, which not every row has. */
  meta?: boolean;
  variant?: "card" | "row";
  density?: "comfortable" | "compact";
  /** Element for the outer surface — `li` inside a `ul`. */
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
}

export function RecordCardSkeleton({
  leading,
  trailing,
  meta = true,
  variant = "card",
  density = "comfortable",
  as,
  className,
  style,
}: RecordCardSkeletonProps): JSX.Element {
  return (
    <Surface
      as={as ?? "div"}
      variant={variant}
      padding={density === "compact" ? "3" : "4"}
      aria-hidden="true"
      className={cx("flex items-center gap-3", className)}
      style={style}
    >
      {leading ?? <Skeleton kind="rect" radius="var(--radius-md)" className="h-12 w-12" />}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <Skeleton kind="pill" className="h-4 w-[70%]" />
        <Skeleton kind="pill" className="h-3 w-[48%]" />
        {meta ? <Skeleton kind="pill" className="h-3 w-[86%]" /> : null}
      </div>
      {trailing ? <div className="flex shrink-0 items-center">{trailing}</div> : null}
    </Surface>
  );
}
