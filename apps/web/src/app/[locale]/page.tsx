// Marketing landing — replaces the H1+CTA stub that was at
// apps/web/src/app/[locale]/page.tsx prior to this PR.
//
// What changed (per design-handoff-2026-05/PRODUCT-HEALTH.md §2 #14):
//   • Hero with the brand mark + headline + body + dual CTAs (Register +
//     Sign in — the latter was missing, blocking returning-user flow).
//   • Three value props framed for the Baydar audience: trust, careers,
//     visibility.
//   • Employer track call-out — pre-launch we expect ~30% of traffic to
//     come for hiring; they need a path that isn't "register as a worker
//     and then find the employer onboarding".
//   • Locale-aware everything — pulls from `landing` namespace; new
//     translation keys at the bottom of this file's docblock.
//
// Server Component (no `"use client"`). next-intl's `getTranslations` runs
// on the server so this whole page is static at request time. Tokens come
// from Tailwind utilities backed by @baydar/ui-tokens.

import { getTranslations, setRequestLocale } from "next-intl/server";
import Link from "next/link";
import type { JSX } from "react";

import type { Locale } from "@/i18n";

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<JSX.Element> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("landing");

  return (
    <main className="bg-surface-muted text-ink min-h-screen">
      {/* ── Top nav: logo + sign-in. The landing page does NOT use the
       *  authenticated <AppShell>; it has its own minimal chrome. */}
      <header className="mx-auto flex w-full max-w-[1128px] items-center justify-between px-6 py-5">
        <Link
          href="/"
          aria-label={t("brand")}
          className="flex items-center gap-2 rounded-md focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]"
        >
          <span
            className="bg-brand-600 text-ink-inverse flex h-9 w-9 items-center justify-center rounded-lg font-sans text-xl font-bold"
            aria-hidden="true"
          >
            {t("markGlyph")}
          </span>
          <span className="font-sans text-lg font-semibold">{t("brand")}</span>
        </Link>
        <nav aria-label={t("nav.label")} className="flex items-center gap-2">
          <Link
            href={`/${locale}/login`}
            className="text-ink hover:bg-surface-subtle hidden rounded-md px-4 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)] sm:inline-flex"
          >
            {t("nav.signIn")}
          </Link>
          <Link
            href={`/${locale}/register`}
            className="bg-brand-600 text-ink-inverse hover:bg-brand-700 rounded-md px-4 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]"
          >
            {t("nav.register")}
          </Link>
        </nav>
      </header>

      {/* ── Hero. Two-column on desktop: copy + decorative panel. ───── */}
      <section className="mx-auto grid w-full max-w-[1128px] grid-cols-1 items-center gap-10 px-6 py-12 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:py-20">
        <div className="flex flex-col gap-6">
          <p className="text-brand-700 text-[12px] font-semibold uppercase tracking-[0.12em]">
            {t("hero.eyebrow")}
          </p>
          <h1 className="text-ink font-sans text-4xl font-bold leading-[1.1] tracking-tight md:text-5xl">
            {t("hero.title")}
          </h1>
          <p className="text-ink-muted max-w-[52ch] text-lg leading-relaxed">{t("hero.body")}</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <Link
              href={`/${locale}/register`}
              className="bg-brand-600 text-ink-inverse hover:bg-brand-700 shadow-card inline-flex items-center rounded-md px-6 py-3 text-base font-semibold focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]"
            >
              {t("hero.ctaPrimary")}
            </Link>
            <Link
              href={`/${locale}/login`}
              className="border-line-hard text-ink hover:bg-surface-subtle inline-flex items-center rounded-md border bg-transparent px-6 py-3 text-base font-semibold focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]"
            >
              {t("hero.ctaSecondary")}
            </Link>
          </div>
          <p className="text-ink-muted text-xs">{t("hero.smallPrint")}</p>
        </div>

        {/* Decorative panel — the wheat mark in a tinted square. No external
         *  asset; SVG is inlined so the page is server-renderable without a
         *  font/image dependency. */}
        <div className="bg-brand-50 border-line-soft relative aspect-[5/4] overflow-hidden rounded-2xl border">
          <svg
            viewBox="0 0 320 256"
            xmlns="http://www.w3.org/2000/svg"
            className="absolute inset-0 h-full w-full"
            aria-hidden="true"
          >
            {/* Olive circle mark, scaled up and offset for a partial-bleed look. */}
            <g transform="translate(160, 128)">
              <circle r="120" className="fill-brand-600" />
              <g className="fill-brand-50">
                <rect x="-1" y="-74" width="2" height="148" rx="1" />
                <ellipse cx="-16" cy="-50" rx="10.5" ry="18.5" transform="rotate(-28 -16 -50)" />
                <ellipse cx="20" cy="-50" rx="10.5" ry="18.5" transform="rotate(28 20 -50)" />
                <ellipse cx="-20" cy="-18" rx="11.5" ry="19.5" transform="rotate(-28 -20 -18)" />
                <ellipse cx="24" cy="-18" rx="11.5" ry="19.5" transform="rotate(28 24 -18)" />
                <ellipse cx="-24" cy="14" rx="11.5" ry="19.5" transform="rotate(-28 -24 14)" />
                <ellipse cx="28" cy="14" rx="11.5" ry="19.5" transform="rotate(28 28 14)" />
                <ellipse cx="-28" cy="46" rx="11.5" ry="19.5" transform="rotate(-28 -28 46)" />
                <ellipse cx="32" cy="46" rx="11.5" ry="19.5" transform="rotate(28 32 46)" />
              </g>
            </g>
          </svg>
        </div>
      </section>

      {/* ── Value props — three cards. ──────────────────────────────── */}
      <section aria-labelledby="value-props" className="border-line-soft bg-surface border-y">
        <div className="mx-auto w-full max-w-[1128px] px-6 py-16">
          <h2
            id="value-props"
            className="text-ink font-sans text-2xl font-semibold tracking-tight md:text-3xl"
          >
            {t("values.heading")}
          </h2>
          <p className="text-ink-muted mt-3 max-w-[52ch] text-base">{t("values.subhead")}</p>
          <ul className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-5">
            {(["trust", "career", "visibility"] as const).map((slot) => (
              <li
                key={slot}
                className="border-line-soft bg-surface-muted shadow-card flex flex-col gap-3 rounded-lg border p-6"
              >
                <span
                  aria-hidden="true"
                  className="bg-brand-100 text-brand-700 mb-1 inline-flex h-10 w-10 items-center justify-center rounded-lg"
                >
                  <ValueGlyph slot={slot} />
                </span>
                <h3 className="text-ink font-sans text-lg font-semibold">
                  {t(`values.${slot}.title`)}
                </h3>
                <p className="text-ink-muted text-sm leading-relaxed">{t(`values.${slot}.body`)}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Employer track call-out — separate path for hiring teams. ─ */}
      <section aria-labelledby="employer-track" className="bg-surface-muted">
        <div className="mx-auto grid w-full max-w-[1128px] grid-cols-1 items-center gap-10 px-6 py-16 md:grid-cols-[1fr_auto]">
          <div>
            <p className="text-accent-700 text-[12px] font-semibold uppercase tracking-[0.12em]">
              {t("employer.eyebrow")}
            </p>
            <h2
              id="employer-track"
              className="text-ink mt-3 font-sans text-2xl font-semibold tracking-tight md:text-3xl"
            >
              {t("employer.title")}
            </h2>
            <p className="text-ink-muted mt-3 max-w-[52ch] text-base">{t("employer.body")}</p>
          </div>
          <Link
            href={`/${locale}/register?as=employer`}
            className="border-accent-600 text-accent-700 hover:bg-accent-50 inline-flex items-center whitespace-nowrap rounded-md border bg-transparent px-5 py-3 text-base font-semibold focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]"
          >
            {t("employer.cta")}
          </Link>
        </div>
      </section>

      {/* ── Footer — minimal: links to legal + locale switch sits here. */}
      <footer className="border-line-soft border-t">
        <div className="mx-auto flex w-full max-w-[1128px] flex-wrap items-center justify-between gap-4 px-6 py-8 text-sm">
          <span className="text-ink-muted">
            {t("footer.copyright", { year: new Date().getFullYear() })}
          </span>
          <nav aria-label={t("footer.label")} className="flex flex-wrap gap-x-5 gap-y-2">
            <Link
              href={`/${locale}/legal/tos`}
              className="text-ink-muted hover:text-brand-700 rounded-sm focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]"
            >
              {t("footer.tos")}
            </Link>
            <Link
              href={`/${locale}/legal/privacy`}
              className="text-ink-muted hover:text-brand-700 rounded-sm focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]"
            >
              {t("footer.privacy")}
            </Link>
            <Link
              href={`/${locale}/legal/community`}
              className="text-ink-muted hover:text-brand-700 rounded-sm focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]"
            >
              {t("footer.community")}
            </Link>
            <Link
              href={`/${locale}/legal/employer`}
              className="text-ink-muted hover:text-brand-700 rounded-sm focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]"
            >
              {t("footer.employer")}
            </Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}

// ── Value-prop glyphs — inlined so this page has zero asset dependencies.
function ValueGlyph({ slot }: { slot: "trust" | "career" | "visibility" }): JSX.Element {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: "h-5 w-5",
    "aria-hidden": true,
  };
  if (slot === "trust") {
    return (
      <svg {...common}>
        <path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    );
  }
  if (slot === "career") {
    return (
      <svg {...common}>
        <rect x="3" y="7" width="18" height="13" rx="2" />
        <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        <path d="M3 13h18" />
      </svg>
    );
  }
  // visibility
  return (
    <svg {...common}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

/* ───────────────────────────────────────────────────────────────────────
 * i18n keys (add to apps/web/messages/en.json — author Arabic equivalents
 * for ar.json + ar-PS.json against the same paths):
 *
 * "landing": {
 *   "brand": "Baydar",
 *   "markGlyph": "ب",
 *   "nav": {
 *     "signIn": "Sign in",
 *     "register": "Get started"
 *   },
 *   "hero": {
 *     "eyebrow": "Built for the Arab professional world",
 *     "title": "Your work, your network, your future — all in one place.",
 *     "body": "Baydar is the professional network rooted in our region. Connect with peers, find your next role, and grow a reputation that travels with you.",
 *     "ctaPrimary": "Create your profile",
 *     "ctaSecondary": "I already have an account",
 *     "smallPrint": "Free forever for individuals. No credit card required."
 *   },
 *   "values": {
 *     "heading": "Built around trust — not surveillance",
 *     "subhead": "Three things we won't compromise on as we grow.",
 *     "trust":      { "title": "Trust by default",     "body": "Verified profiles. Real names. Karama points reward thoughtful contributions — never reach-bait." },
 *     "career":     { "title": "Careers that fit",     "body": "Roles ranked by skill match, salary clarity, and your declared region. No vague hot-leads, no spam recruiters." },
 *     "visibility": { "title": "Visibility you control","body": "Choose who sees your profile, who can message you, and whether you appear in suggestions. One screen, no dark patterns." }
 *   },
 *   "employer": {
 *     "eyebrow": "For employers",
 *     "title": "Hire from the strongest pool of Arab talent.",
 *     "body": "Post a role in minutes, review applicants in context, and tap into a network that's still building its first connections — yours.",
 *     "cta": "Start hiring"
 *   },
 *   "footer": {
 *     "copyright": "© {year} Baydar — All rights reserved.",
 *     "tos": "Terms",
 *     "privacy": "Privacy",
 *     "community": "Community guidelines",
 *     "employer": "Employer agreement"
 *   }
 * }
 *
 * ─────────────────────────────────────────────────────────────────────── */
