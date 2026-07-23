// The ROOT not-found — Next serves this for any unmatched path, including
// `/ar-PS/<typo>`, so it is the 404 users actually hit. It renders outside the
// `[locale]` segment, so there is no next-intl context and `useTranslations`
// is unavailable. Per BRAND.md the un-localized surface is Arabic, not
// English: this file used to be English-only, which is the one thing CLAUDE.md
// says never to ship.

import Link from "next/link";
import type { JSX } from "react";

export default function NotFound(): JSX.Element {
  return (
    <main className="bg-surface-muted text-ink grid min-h-screen place-items-center px-6 py-10">
      <section
        dir="rtl"
        className="border-line-soft bg-surface shadow-card w-full max-w-[480px] rounded-lg border px-6 py-10 text-center sm:px-8"
      >
        <div className="text-brand-600 mb-4 font-sans text-[80px] font-bold leading-none sm:text-[88px]">
          ٤٠٤
        </div>
        <h1 className="text-[22px] font-semibold leading-tight">راحت الصفحة</h1>
        <p className="text-ink-muted mx-auto mt-2 max-w-[44ch] text-sm leading-relaxed">
          يمكن الرابط غلط، أو المنشور محذوف، أو المعرّف مش موجود. جرّب البحث، أو ارجع لموجزك.
        </p>
        <nav className="mt-6 flex flex-wrap justify-center gap-2" aria-label="روابط العودة">
          <Link
            href="/feed"
            className="border-brand-600 bg-brand-600 text-ink-inverse rounded-md border px-4 py-2 text-sm font-semibold no-underline focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]"
          >
            الموجز
          </Link>
          <Link
            href="/search"
            className="border-line-hard bg-surface text-ink rounded-md border px-4 py-2 text-sm font-semibold no-underline focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]"
          >
            بحث
          </Link>
        </nav>
      </section>
    </main>
  );
}
