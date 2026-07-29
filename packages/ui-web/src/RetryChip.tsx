"use client";

// RetryChip — inline retry pill.
//
// API stable; visual spec owed by Claude Design (HANDOFF-TO-DESIGN-2026-05-16
// §C.24). Used wherever a small surface needs to recover from a transient
// failure inline (feed rails, message bubbles, search results).
//
// Hit target: 28px high keeps the chip inline-friendly but still focusable.

import type { ReactElement } from "react";

export interface RetryChipProps {
  onRetry(): void;
  label: string;
  loading?: boolean;
  // Inline within a sentence vs standalone pill — affects padding.
  inline?: boolean;
}

export function RetryChip({ onRetry, label, loading, inline }: RetryChipProps): ReactElement {
  return (
    <button
      type="button"
      onClick={onRetry}
      disabled={loading}
      aria-busy={loading || undefined}
      className={
        "text-brand-700 hover:text-brand-800 focus-visible:outline-hidden inline-flex items-center gap-1 rounded-md text-xs font-semibold focus-visible:[box-shadow:var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-60 " +
        (inline ? "px-1 py-0.5" : "px-2 py-1")
      }
    >
      {label}
    </button>
  );
}
