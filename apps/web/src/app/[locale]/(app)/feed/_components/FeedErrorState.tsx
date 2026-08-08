"use client";

import { RetryChip, Surface } from "@baydar/ui-web";
import type { JSX } from "react";

/**
 * The feed's "we could not load this" block.
 *
 * Its own file because `page.tsx` reached the 300-LOC design ceiling, and a
 * presentational block with no data dependencies is the cleanest thing to lift
 * out of a screen that already fetches, paginates and composes.
 */
export function FeedErrorState({
  title,
  body,
  retryLabel,
  onRetry,
  loading,
}: {
  title: string;
  body: string;
  retryLabel: string;
  onRetry: () => void;
  loading: boolean;
}): JSX.Element {
  return (
    <Surface variant="tinted" padding="6" className="flex flex-col items-start gap-2">
      <h2 className="text-ink text-sm font-semibold">{title}</h2>
      <p className="text-ink-muted text-sm">{body}</p>
      <RetryChip onRetry={onRetry} label={retryLabel} loading={loading} />
    </Surface>
  );
}
