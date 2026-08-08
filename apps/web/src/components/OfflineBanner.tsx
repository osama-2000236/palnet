"use client";

import { Alert } from "@baydar/ui-web";
import { useTranslations } from "next-intl";
import type { JSX } from "react";

import { useOnline } from "@/lib/useOnline";

/**
 * The web twin of mobile's offline banner.
 *
 * Web had none, which meant a member whose connection died saw requests fail
 * one by one with no explanation while the app looked fine. Mobile has said so
 * since it shipped; parity here is not a nicety, it is the difference between
 * "the network is down" and "this product is broken".
 *
 * `role="alert"` via `Alert`'s severity: this is the one state where
 * interrupting a screen reader is correct, because everything the member does
 * next will fail until it clears.
 */
export function OfflineBanner(): JSX.Element | null {
  const t = useTranslations("connection.offline");
  const state = useOnline();

  if (state !== "offline") return null;

  return <Alert kind="warning" title={t("title")} body={t("body")} />;
}
