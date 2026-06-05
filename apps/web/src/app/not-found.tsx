import Link from "next/link";
import type { JSX } from "react";

export default function NotFound(): JSX.Element {
  return (
    <main className="bg-surface-muted text-ink grid min-h-screen place-items-center px-6 py-10">
      <section className="border-line-soft bg-surface shadow-card w-full max-w-[480px] rounded-lg border px-6 py-10 text-center sm:px-8">
        <div
          dir="ltr"
          className="text-brand-600 mb-4 font-sans text-[80px] font-bold leading-none sm:text-[88px]"
        >
          404
        </div>
        <h1 className="text-[22px] font-semibold leading-tight">That page slipped away</h1>
        <p className="text-ink-muted mx-auto mt-2 max-w-[44ch] text-sm leading-relaxed">
          The link might be wrong, the post might be deleted, or the handle might not exist. Try a
          search, or head back to your feed.
        </p>
        <nav className="mt-6 flex flex-wrap justify-center gap-2" aria-label="Recovery links">
          <Link
            href="/feed"
            className="border-brand-600 bg-brand-600 text-ink-inverse rounded-md border px-4 py-2 text-sm font-semibold no-underline focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]"
          >
            Go to feed
          </Link>
          <Link
            href="/search"
            className="border-line-hard bg-surface text-ink rounded-md border px-4 py-2 text-sm font-semibold no-underline focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]"
          >
            Search
          </Link>
        </nav>
      </section>
    </main>
  );
}
