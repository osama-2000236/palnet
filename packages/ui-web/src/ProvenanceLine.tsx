// ProvenanceLine — web twin of packages/ui-native/src/ProvenanceLine.tsx.
//
// One clause saying why this list is in this order. Required on every ranked
// surface: feed, search, applicants, suggestions, composer reach, job reach.
//
// The visible half of the `settings.explainRanking` switch. It states the
// MECHANISM ("proximity first, then relevance"), never the benefit. See
// handoff/components/ProvenanceLine.md.

import type { CSSProperties, JSX } from "react";

import { cx } from "./cx";

export interface ProvenanceLineProps {
  /** One clause, no period. From i18n — never composed in the component. */
  text: string;
  /** Count or scope, rendered mono. */
  trailing?: string;
  tone?: "neutral" | "accent";
  /** Opens the ranking explanation. The whole row becomes the target. */
  onClick?: () => void;
  /** `band` = full-bleed tinted strip. `inline` = bare, for use inside a card. */
  variant?: "band" | "inline";
  className?: string;
  style?: CSSProperties;
  "data-testid"?: string;
}

export function ProvenanceLine({
  text,
  trailing,
  tone = "neutral",
  onClick,
  variant = "band",
  className,
  style,
  "data-testid": testId,
}: ProvenanceLineProps): JSX.Element {
  // Text and trailing read as one label so the screen reader does not split the
  // count from the clause.
  const label = trailing ? `${text} — ${trailing}` : text;

  const body = (
    <>
      <span
        aria-hidden="true"
        data-testid={testId ? `${testId}-dot` : undefined}
        className={cx(
          "size-[5px] shrink-0 rounded-full",
          tone === "accent" ? "bg-accent-500" : "bg-brand-600",
        )}
      />
      <span className="text-micro text-ink-muted min-w-0 flex-1">{text}</span>
      {trailing ? <span className="text-micro text-ink-subtle font-mono">{trailing}</span> : null}
    </>
  );

  const shared = cx(
    "flex w-full items-center gap-2 text-start",
    variant === "band"
      ? "border-b border-rule-hairline bg-surface-band px-4 py-3"
      : "bg-transparent px-0 py-1",
    className,
  );

  if (!onClick) {
    return (
      <div className={shared} style={style} data-testid={testId} aria-label={label}>
        {body}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      data-testid={testId}
      // 40px is the repo's web minimum hit target (tokens.target.compact).
      className={cx(shared, "focus-visible:outline-brand-600 min-h-10")}
      style={style}
    >
      {body}
    </button>
  );
}
