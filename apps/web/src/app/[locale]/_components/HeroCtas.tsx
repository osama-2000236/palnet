"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { type JSX, useEffect, useState } from "react";

import { readSession } from "@/lib/session";

/**
 * The landing page is a Server Component and the session lives in
 * `localStorage`, so the server cannot know whether the visitor is signed in.
 * The result was that a returning member who typed the domain was met with
 * "Create an account" as the primary call to action — an acquisition page
 * inviting them to make a second account.
 *
 * This owns the whole hero CTA cluster and swaps it client-side once the
 * session is readable. The signed-out pair renders until then, so the
 * marketing page is never blank for a first-time visitor or a crawler, and
 * there is no redirect to flash.
 */
const PRIMARY =
  "bg-brand-600 text-ink-inverse hover:bg-brand-700 shadow-card inline-flex items-center rounded-md px-6 py-3 text-base font-semibold focus-visible:outline-hidden focus-visible:[box-shadow:var(--focus-ring)]";
const SECONDARY =
  "border-line-hard text-ink hover:bg-surface-subtle inline-flex items-center rounded-md border bg-transparent px-6 py-3 text-base font-semibold focus-visible:outline-hidden focus-visible:[box-shadow:var(--focus-ring)]";

export function HeroCtas({ locale }: { locale: string }): JSX.Element {
  const t = useTranslations("landing");
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    setSignedIn(readSession() !== null);
  }, []);

  if (signedIn) {
    return (
      <Link href={`/${locale}/feed`} className={PRIMARY}>
        {t("hero.ctaReturning")}
      </Link>
    );
  }

  return (
    <>
      <Link href={`/${locale}/register`} className={PRIMARY}>
        {t("hero.ctaPrimary")}
      </Link>
      <Link href={`/${locale}/login`} className={SECONDARY}>
        {t("hero.ctaSecondary")}
      </Link>
    </>
  );
}
