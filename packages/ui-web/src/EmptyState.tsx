// EmptyState — replaces every bare "لا يوجد شيء هنا بعد" string in the
// product with a consistent illustration + title + body + action recipe.
// Spec: design-pass-1/component-changes.md.
//
// Use this whenever a query, list, or filter returns zero rows. Never ship
// a bare line of copy.

import type { JSX, ReactNode } from "react";

import { Button } from "./Button";
import { cx } from "./cx";
import {
  Illustration,
  type IllustrationDirection,
  type IllustrationMotif,
  type IllustrationSize,
  type IllustrationTint,
} from "./Illustration";

export interface EmptyStateProps {
  motif: IllustrationMotif;
  direction?: IllustrationDirection;
  tint?: IllustrationTint;
  size?: IllustrationSize;
  title: string;
  body?: ReactNode;
  /** Primary action label. */
  cta?: string;
  onAction?(): void;
  /** Secondary text-link label. */
  altCta?: string;
  onAltAction?(): void;
  /**
   * `standalone` — full empty slot (page-level). Default.
   * `inline` — compact, for sub-sections inside an already-bounded surface.
   */
  variant?: "standalone" | "inline";
  align?: "center" | "start";
  className?: string;
}

export function EmptyState({
  motif,
  direction = "harvest",
  tint = "sand",
  size,
  title,
  body,
  cta,
  onAction,
  altCta,
  onAltAction,
  variant = "standalone",
  align = "center",
  className,
}: EmptyStateProps): JSX.Element {
  const inline = variant === "inline";
  const resolvedSize: IllustrationSize = size ?? (inline ? "sm" : "md");
  return (
    <div
      className={cx(
        "flex flex-col",
        align === "center" ? "items-center text-center" : "items-start text-start",
        inline ? "gap-3 px-4 py-5" : "gap-4 px-6 py-9",
        className,
      )}
    >
      <Illustration motif={motif} direction={direction} tint={tint} size={resolvedSize} />
      <div className={cx("flex flex-col", inline ? "gap-1" : "gap-1.5")}>
        <h3
          className={cx(
            "text-ink font-semibold",
            inline ? "text-base leading-snug" : "text-[19px] leading-snug",
          )}
        >
          {title}
        </h3>
        {body ? (
          <p
            className={cx(
              "text-ink-muted max-w-[48ch]",
              inline ? "text-[13px] leading-relaxed" : "text-[15px] leading-relaxed",
            )}
          >
            {body}
          </p>
        ) : null}
      </div>
      {cta || altCta ? (
        <div
          className={cx(
            "flex flex-col items-center",
            inline ? "mt-0 gap-1" : "mt-1 gap-1.5",
          )}
        >
          {cta ? (
            <Button variant="primary" size={inline ? "sm" : "md"} onClick={onAction}>
              {cta}
            </Button>
          ) : null}
          {altCta ? (
            <Button variant="ghost" size="sm" onClick={onAltAction}>
              {altCta}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
