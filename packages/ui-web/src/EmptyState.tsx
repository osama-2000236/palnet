// EmptyState — the empty-state surface mandated by DESIGN.md §12:
// illustration slot + title + description + recoverable action.
//
// Pair with one of the illustrations from ./illustrations.tsx, or pass any
// custom node. Illustration color inherits from the wrapping text color
// (text-brand-700 here), so SVGs only need `stroke="currentColor"`.

import { useId, type JSX, type ReactNode } from "react";

import { Button, type ButtonVariant } from "./Button";
import { cx } from "./cx";
import { Surface, type SurfacePadding } from "./Surface";

export interface EmptyStateAction {
  label: string;
  onClick: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  /** Render the action as an anchor instead of a button — pass an href. */
  href?: string;
}

export interface EmptyStateProps {
  illustration?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: EmptyStateAction;
  /** Tighter vertical padding for dense lists / right rails. */
  density?: "comfortable" | "compact";
  /** Override the rendered semantic. Default `div` (in-flow block). Use `section` only when this is the sole content of a region. */
  as?: "section" | "div";
  className?: string;
  /** Set when EmptyState is the only content of a labelled region (sets role=status). */
  live?: boolean;
}

const PADDING: Record<NonNullable<EmptyStateProps["density"]>, SurfacePadding> = {
  comfortable: "8",
  compact: "5",
};

export function EmptyState({
  illustration,
  title,
  description,
  action,
  density = "comfortable",
  as = "div",
  className,
  live = false,
}: EmptyStateProps): JSX.Element {
  const titleId = useId();
  const isLandmark = as === "section";
  return (
    <Surface
      as={as}
      variant="tinted"
      padding={PADDING[density]}
      className={cx("text-brand-700 flex flex-col items-center gap-3 text-center", className)}
      role={live ? "status" : undefined}
      aria-live={live ? "polite" : undefined}
      aria-labelledby={isLandmark ? titleId : undefined}
    >
      {illustration ? (
        <div
          aria-hidden="true"
          className="text-brand-700 flex shrink-0 items-center justify-center"
        >
          {illustration}
        </div>
      ) : null}
      <div className="flex flex-col gap-1">
        <h3 id={titleId} className="text-ink text-base font-semibold">
          {title}
        </h3>
        {description ? (
          <p className="text-ink-muted mx-auto max-w-md text-sm">{description}</p>
        ) : null}
      </div>
      {action ? (
        action.href ? (
          <a
            href={action.href}
            className="bg-brand-600 text-ink-inverse hover:bg-brand-700 focus-visible:ring-brand-500 focus-visible:ring-offset-surface mt-1 inline-flex h-9 items-center justify-center rounded-md px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          >
            {action.label}
          </a>
        ) : (
          <Button
            variant={action.variant ?? "primary"}
            size="md"
            loading={action.loading}
            onClick={action.onClick}
            className="mt-1"
          >
            {action.label}
          </Button>
        )
      ) : null}
    </Surface>
  );
}
