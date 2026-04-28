"use client";

import { cx } from "./cx";

export interface SkeletonProps {
  width?: string;
  height?: string;
  radius?: "xs" | "sm" | "md" | "lg" | "full";
  kind?: "rect" | "circle" | "pill";
  className?: string;
}

const RADIUS_CLASS: Record<NonNullable<SkeletonProps["radius"]>, string> = {
  xs: "rounded-xs",
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
  full: "rounded-full",
};

export function Skeleton({
  width,
  height,
  radius,
  kind = "rect",
  className,
}: SkeletonProps): JSX.Element {
  const computedRadius = radius ?? (kind === "circle" || kind === "pill" ? "full" : "sm");

  return (
    <span
      aria-hidden="true"
      className={cx(
        "bg-surface-sunken inline-flex animate-pulse",
        RADIUS_CLASS[computedRadius],
        className,
      )}
      style={{ width, height }}
    />
  );
}
