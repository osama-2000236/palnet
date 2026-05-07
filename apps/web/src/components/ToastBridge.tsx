"use client";

import { ToastProvider } from "@baydar/ui-web";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

export function ToastBridge({ children }: { children: ReactNode }): JSX.Element {
  const t = useTranslations("toast");
  return <ToastProvider dismissLabel={t("dismiss.aria")}>{children}</ToastProvider>;
}
