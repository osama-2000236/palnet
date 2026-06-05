"use client";

// Banner — MVP top banner primitive.
//
// API stable; visual spec owed by Claude Design (HANDOFF-TO-DESIGN-2026-05-16
// §C.23). Uses --*-soft semantic tokens emitted in ui-tokens/tokens.css.
//
// Use cases:
//   • Offline / network status (kind="warning", dismissible=false).
//   • Action result confirmations (kind="success", dismissible=true).
//   • Long-running maintenance notices (kind="info", dismissible=true).

import type { ReactElement, ReactNode } from "react";

export type BannerKind = "info" | "warning" | "danger" | "success";

export interface BannerProps {
  kind: BannerKind;
  children: ReactNode;
  dismissible?: boolean;
  onDismiss?(): void;
  // aria-live politeness. Defaults to "polite"; pass "assertive" for danger.
  live?: "polite" | "assertive";
  dismissLabel?: string;
}

const SOFT_BG: Record<BannerKind, string> = {
  info: "bg-[var(--info-soft)]",
  warning: "bg-[var(--warning-soft)]",
  danger: "bg-[var(--danger-soft)]",
  success: "bg-[var(--success-soft)]",
};

const FG: Record<BannerKind, string> = {
  info: "text-info",
  warning: "text-warning",
  danger: "text-danger",
  success: "text-success",
};

export function Banner({
  kind,
  children,
  dismissible,
  onDismiss,
  live,
  dismissLabel,
}: BannerProps): ReactElement {
  return (
    <div
      role="status"
      aria-live={live ?? (kind === "danger" ? "assertive" : "polite")}
      className={`${SOFT_BG[kind]} ${FG[kind]} flex items-center gap-3 px-4 py-2 text-sm`}
    >
      <span className="flex-1">{children}</span>
      {dismissible && onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          aria-label={dismissLabel ?? "إغلاق"}
          className="text-ink-muted hover:text-ink inline-flex h-6 w-6 items-center justify-center rounded focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]"
        >
          <span aria-hidden="true">×</span>
        </button>
      ) : null}
    </div>
  );
}
