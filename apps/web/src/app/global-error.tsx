"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): JSX.Element {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="ar" dir="rtl">
      <body className="bg-surface text-ink">
        <main className="max-w-dialog mx-auto flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
          <h1 className="text-2xl font-semibold">تعذر تحميل الصفحة</h1>
          <p className="text-ink-muted text-sm">سجلنا الخطأ وسنراجعه. يمكنك المحاولة مرة أخرى.</p>
          <button
            type="button"
            onClick={reset}
            className="bg-brand-600 text-ink-inverse focus-visible:ring-brand-600 focus-visible:ring-offset-surface inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          >
            حاول مرة أخرى
          </button>
        </main>
      </body>
    </html>
  );
}
