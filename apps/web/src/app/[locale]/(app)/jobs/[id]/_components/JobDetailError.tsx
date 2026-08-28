"use client";

// The two ways a job detail page can have nothing to show, which are not the
// same thing: the request failed, or the job is gone.
//
// They used to render identically — one sentence and a link back — so a
// transient 500 cost the reader the page. Only a failure can be retried, so only
// it carries the action; the link back stays for both. Lifted out of `page.tsx`
// to sit beside its siblings, and because that file is at the 300 LOC ceiling
// `qa:design` enforces.

import { Alert, Surface } from "@baydar/ui-web";
import Link from "next/link";
import { useTranslations } from "next-intl";

export function JobDetailError({
  /** `null` when the job is simply absent — a 404, not a failure. */
  error,
  busy,
  onRetry,
}: {
  error: string | null;
  busy: boolean;
  onRetry: () => void;
}): JSX.Element {
  const t = useTranslations("jobs");
  const tCommon = useTranslations("common");

  return (
    <main className="mx-auto w-full max-w-[820px] px-4 py-6">
      {error ? (
        <Alert kind="danger" body={error} cta={tCommon("retry")} onAction={onRetry} busy={busy} />
      ) : (
        <Surface variant="tinted" padding="6">
          <p className="text-ink-muted text-sm">{t("notFound")}</p>
        </Surface>
      )}
      <Link
        href="/jobs"
        className="text-brand-700 focus-visible:outline-hidden mt-3 inline-block text-sm hover:underline focus-visible:[box-shadow:var(--focus-ring)]"
      >
        <span aria-hidden="true" className="inline-block rtl:rotate-180">
          ←
        </span>{" "}
        {t("title")}
      </Link>
    </main>
  );
}
