// Skeleton — web twin of packages/ui-native/src/Skeleton.tsx.
//
// Use for tokenized loading placeholders. The native API requires width and
// height; the web twin keeps those props optional so callers can also size via
// utility classes in constrained layouts.

import type { CSSProperties, JSX } from "react";

import { cx } from "./cx";

export interface SkeletonProps {
  width?: CSSProperties["width"];
  height?: CSSProperties["height"];
  radius?: CSSProperties["borderRadius"];
  kind?: "rect" | "circle" | "pill";
  className?: string;
  style?: CSSProperties;
}

export function Skeleton({
  width,
  height,
  radius,
  kind = "rect",
  className,
  style,
}: SkeletonProps): JSX.Element {
  const computedRadius =
    radius ?? (kind === "circle" || kind === "pill" ? "9999px" : "var(--radius-sm)");

  return (
    <span
      aria-hidden="true"
      className={cx("bg-surface-sunken inline-block animate-pulse", className)}
      style={{
        width,
        height,
        borderRadius: computedRadius,
        ...style,
      }}
    />
  );
}
