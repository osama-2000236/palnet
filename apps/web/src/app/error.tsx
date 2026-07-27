"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): JSX.Element {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[RootError]", error);
  }, [error]);

  return (
    <main className="bg-surface-muted text-ink grid min-h-screen place-items-center px-6 py-10">
      <section className="border-line-soft bg-surface shadow-card w-full max-w-[440px] rounded-lg border p-8 text-center">
        <div
          aria-hidden="true"
          className="bg-brand-600 text-ink-inverse mx-auto mb-5 grid h-12 w-12 place-items-center rounded-md font-sans text-2xl font-bold"
        >
          ب
        </div>
        <h1 className="text-h1 font-semibold leading-tight">Something broke on our end</h1>
        <p className="text-ink-muted mx-auto mt-2 max-w-[38ch] text-sm leading-relaxed">
          We hit an unexpected error while loading Baydar. Try again, or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => reset()}
            className="border-brand-600 bg-brand-600 text-ink-inverse rounded-md border px-4 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]"
          >
            Try again
          </button>
          <Link
            href="/"
            className="border-line-hard bg-surface text-ink rounded-md border px-4 py-2 text-sm font-semibold no-underline focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]"
          >
            Go home
          </Link>
        </div>
        {error.digest ? (
          <p className="text-ink-subtle text-micro mt-6 font-mono" dir="ltr">
            Error ID: {error.digest}
          </p>
        ) : null}
      </section>
    </main>
  );
}
