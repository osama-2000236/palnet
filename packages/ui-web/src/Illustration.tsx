// Illustration — per-motif graphics used by EmptyState and any screen that
// needs one without inventing a new SVG. Lifted from the Design Pass 1 spec
// (component-changes.md) so motifs stay in sync with the design system.
// ponytail: harvest kit only — the outline/block kits were never rendered;
// recover them from git history if a future design pass wants them.
//
// Stroke weight, palette, and viewBox match the design-pass output exactly —
// fills are tokenised, no raw hex.

import type { JSX } from "react";
import { useMemo } from "react";

import { cx } from "./cx";
import { HarvestSet } from "./IllustrationHarvest";

export const ILLUSTRATION_MOTIFS = [
  "feed",
  "network",
  "messages",
  "notifications",
  "search",
  "jobs",
  "onboarding",
  "settings",
  "error",
  "saved",
] as const;
export type IllustrationMotif = (typeof ILLUSTRATION_MOTIFS)[number];

export type IllustrationSize = "sm" | "md" | "lg";
export type IllustrationTint = "none" | "sand" | "olive" | "sunken";

export interface IllustrationProps {
  motif: IllustrationMotif;
  size?: IllustrationSize;
  tint?: IllustrationTint;
  className?: string;
}

const SIZE_PX: Record<IllustrationSize, number> = { sm: 96, md: 140, lg: 180 };
const VB_W = 140;
const VB_H = 100;

const TINT_BG: Record<IllustrationTint, string> = {
  none: "transparent",
  sand: "var(--illus-tint-sand)",
  olive: "var(--illus-tint-olive)",
  sunken: "var(--illus-tint-sunken)",
};

export function Illustration({
  motif,
  size = "md",
  tint = "sand",
  className,
}: IllustrationProps): JSX.Element {
  const px = SIZE_PX[size];
  const h = Math.round((px * VB_H) / VB_W);

  return useMemo(() => {
    return (
      <div
        aria-hidden="true"
        className={cx(
          "inline-flex shrink-0 items-center justify-center",
          tint !== "none" && "rounded-lg",
          className,
        )}
        style={{ width: px, height: h, background: TINT_BG[tint] }}
      >
        <svg width="100%" height="100%" viewBox={`0 0 ${VB_W} ${VB_H}`} role="presentation">
          <HarvestSet motif={motif} />
        </svg>
      </div>
    );
  }, [motif, size, tint, className]);
}
