// EvidenceMeter — the score, and what it is made of.
//
// A bare number is a judgement nobody can argue with. This always renders the
// terms underneath it, so «٤٢» is not a verdict on a person but a list of what
// they have and have not been able to show yet — which is also the only version
// a member can act on.
//
// The host formats every number and supplies every label; ui-web calls no Intl
// and spells no Arabic.

import type { JSX } from "react";

import { cx } from "./cx";

export interface EvidenceTerm {
  key: string;
  /** «أعمال مؤكَّدة» */
  label: string;
  /** Already localised: "٤ من ٦". */
  value: string;
  /** 0..1. Drives the bar; the number above is what the reader trusts. */
  fill: number;
}

export interface EvidenceMeterProps {
  /** 0-100, already formatted in the reader's digits. */
  score: string;
  /** Raw 0-100, for the progress semantics screen readers get. */
  scoreValue: number;
  /** «قوة الملف» */
  label: string;
  terms: EvidenceTerm[];
  className?: string;
}

export function EvidenceMeter({
  score,
  scoreValue,
  label,
  terms,
  className,
}: EvidenceMeterProps): JSX.Element {
  return (
    <div className={cx("flex flex-col gap-3", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-ink-muted text-small">{label}</span>
        <span
          className="text-ink text-h3 font-semibold"
          role="meter"
          aria-valuenow={scoreValue}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={label}
        >
          {score}
        </span>
      </div>
      <ul className="flex flex-col gap-2">
        {terms.map((term) => (
          <li key={term.key} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-ink text-small">{term.label}</span>
              <span className="text-ink-muted text-micro">{term.value}</span>
            </div>
            {/* Decorative: the pair above already carries the same fact in text,
                and a second announcement per term is noise on a screen reader. */}
            <div aria-hidden="true" className="bg-surface-subtle h-1 w-full rounded-full">
              <div
                className="bg-brand-600 h-1 rounded-full"
                style={{ inlineSize: `${Math.round(Math.min(Math.max(term.fill, 0), 1) * 100)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
