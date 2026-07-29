"use client";

import { Button, Surface, Illustration } from "@baydar/ui-web";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import Link from "next/link";

export default function LocaleErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): JSX.Element {
  const t = useTranslations("errors.boundary");
  const tCommon = useTranslations("common");

  useEffect(() => {
    if (typeof window !== "undefined") {
      console.error("[error.tsx]", error);
    }
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-[560px] flex-col gap-4 px-6 py-12">
      <Surface
        variant="tinted"
        padding="8"
        className="flex flex-col items-center gap-4 text-center"
      >
        {/* `block` is the failure register — see DESIGN.md §7.5. */}
        <Illustration motif="error" direction="block" size="lg" />
        <h1 className="text-ink text-xl font-semibold">{t("title")}</h1>
        <p className="text-ink-muted text-sm">{t("body")}</p>
        <Button variant="primary" size="md" onClick={reset}>
          {tCommon("retry")}
        </Button>
        <Link href="/" className="text-ink-muted mt-4 underline">
          {tCommon("goHome")}
        </Link>
        {error.digest ? (
          <p className="text-micro text-ink-subtle font-mono">{error.digest}</p>
        ) : null}
      </Surface>
    </main>
  );
}
