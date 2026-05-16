"use client";

import { Button, Surface } from "@baydar/ui-web";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

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
        <h1 className="text-ink text-xl font-semibold">{t("title")}</h1>
        <p className="text-ink-muted text-sm">{t("body")}</p>
        <Button variant="primary" size="md" onClick={reset}>
          {tCommon("retry")}
        </Button>
        {error.digest ? (
          <p className="text-ink-subtle font-mono text-[11px]">{error.digest}</p>
        ) : null}
      </Surface>
    </main>
  );
}
