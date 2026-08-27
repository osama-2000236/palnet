"use client";

// The feed's retryable error surface, rendered both in place of the timeline
// and beneath it when a later page fails. Lifted out of `page.tsx` to sit
// beside its siblings (`OnboardingDoneCard`, `ProfileCompletenessCard`) rather
// than to make room — `page.tsx` was over the 300 LOC ceiling `qa:design`
// enforces.

import { RetryChip, Surface } from "@baydar/ui-web";

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
