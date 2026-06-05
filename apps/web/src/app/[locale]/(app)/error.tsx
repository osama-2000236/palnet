"use client";

// (app) segment error boundary. Catches errors thrown by any authenticated
// route — feed, profiles, jobs, messages, settings. Renders WITHIN the
// AppShell layout (chrome is still visible), so the user can navigate
// elsewhere even when a specific page is broken.
//
// Next.js App Router contract:
//   • Must be a Client Component.
//   • Receives { error, reset } — `reset()` re-renders the failing page.
//   • Sits at `app/[locale]/(app)/error.tsx`, sibling to the (app) layout.
//
// We use the design system here (unlike the root error.tsx) because the
// (app) layout has already mounted successfully — fonts + tokens + translations
// are known-good by the time this fires.

import { EmptyState, Surface } from "@baydar/ui-web";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

export default function AppSegmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): JSX.Element {
  const t = useTranslations("errors");
  const tCommon = useTranslations("common");

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[AppSegmentError]", error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-[760px] flex-col gap-3 px-6 py-12">
      <Surface variant="card" padding="0">
        <EmptyState
          motif="error"
          title={t("segmentTitle")}
          body={t("segmentBody")}
          cta={tCommon("retry")}
          onAction={reset}
          altCta={tCommon("goHome")}
          onAltAction={() => {
            // Hard nav so we drop any poisoned client state.
            window.location.href = "/feed";
          }}
        />
        {error.digest ? (
          <p className="text-ink-subtle border-line-soft border-t px-6 pb-4 pt-3 text-center font-mono text-[11px]">
            Error ID: {error.digest}
          </p>
        ) : null}
      </Surface>
    </main>
  );
}
