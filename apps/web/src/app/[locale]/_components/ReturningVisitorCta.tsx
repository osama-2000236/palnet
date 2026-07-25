"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { type JSX, type ReactNode, useEffect, useState } from "react";

import { readSession } from "@/lib/session";

/**
 * The landing page is a Server Component and the session lives in
 * `localStorage`, so the server cannot know whether the visitor is signed in.
 * The result was that a returning member who typed the domain was met with
 * "Create an account" as the primary call to action — an acquisition page
 * inviting them to make a second account.
 *
 * This swaps the CTAs client-side once the session is readable. It renders
 * `children` (the signed-out CTAs) until then, so the marketing page is never
 * blank for a first-time visitor or for a crawler, and there is no redirect to
 * flash.
 */
export function ReturningVisitorCta({
  locale,
  className,
  children,
}: {
  locale: string;
  className?: string;
  children: ReactNode;
}): JSX.Element {
  const t = useTranslations("landing");
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    setSignedIn(readSession() !== null);
  }, []);

  if (!signedIn) return <>{children}</>;

  return (
    <Link
      href={`/${locale}/feed`}
      className={
        className ??
        "bg-brand-600 text-ink-inverse hover:bg-brand-700 shadow-card inline-flex items-center rounded-md px-6 py-3 text-base font-semibold focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]"
      }
    >
      {t("hero.ctaReturning")}
    </Link>
  );
}
