"use client";

import {
  formatMoney,
  BillingCatalog,
  BillingMe,
  Invoice,
  KaramaBalance,
  PlanCode,
  type BillingCatalog as BillingCatalogDto,
  type BillingMe as BillingMeDto,
  type Invoice as InvoiceDto,
  type KaramaBalance as KaramaBalanceDto,
} from "@baydar/shared";
import { Alert, Button, Skeleton, Surface } from "@baydar/ui-web";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { z } from "zod";

import { CheckoutPanel } from "@/components/billing/CheckoutPanel";
import { InvoiceList } from "@/components/billing/InvoiceList";
import { apiFetch, getValidAccessToken } from "@/lib/api";
import { toErrorMessage } from "@/lib/error-message";

const InvoicesResponse = z.array(Invoice);

// Premium feature keys we know how to label, in display order. Server-side
// plan features that aren't listed here simply don't render.
const PREMIUM_FEATURE_KEYS = ["analytics", "whoViewed", "diasporaBadge"] as const;
const FREE_FEATURE_KEYS = ["profile", "connect", "jobs"] as const;

export default function PremiumPage(): JSX.Element {
  const t = useTranslations("premium");
  const tErrors = useTranslations("errors");
  const tCommon = useTranslations("common");
  const locale = useLocale();

  const [catalog, setCatalog] = useState<BillingCatalogDto | null>(null);
  const [billingMe, setBillingMe] = useState<BillingMeDto | null>(null);
  const [karama, setKarama] = useState<KaramaBalanceDto | null>(null);
  const [invoices, setInvoices] = useState<InvoiceDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  async function load(): Promise<void> {
    // The (app) layout owns the login redirect; here we only wait for a
    // usable token (refreshing if the in-memory one is gone after a reload).
    const token = await getValidAccessToken();
    if (!token) return;
    setError(null);
    try {
      const [nextCatalog, nextMe, nextKarama, nextInvoices] = await Promise.all([
        apiFetch("/billing/catalog", BillingCatalog, { token }),
        apiFetch("/billing/me", BillingMe, { token }),
        apiFetch("/karama/balance", KaramaBalance, { token }),
        apiFetch("/billing/invoices", InvoicesResponse, { token }),
      ]);
      setCatalog(nextCatalog);
      setBillingMe(nextMe);
      setKarama(nextKarama);
      // Personal scope only — company invoices live on the employer billing page.
      setInvoices(nextInvoices.filter((invoice) => invoice.userId !== null));
    } catch (caught) {
      setError(toErrorMessage(caught, tErrors));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const plan = catalog?.plans.find((entry) => entry.code === PlanCode.USER_PREMIUM) ?? null;
  const subscription = billingMe?.subscription ?? null;
  const hasPremium = subscription !== null && subscription.plan?.code === PlanCode.USER_PREMIUM;

  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: "long" });

  return (
    <main className="mx-auto flex w-full max-w-[880px] flex-col gap-5 px-6 py-8">
      <header className="flex flex-col gap-1">
        <p className="text-brand-700 text-sm font-semibold">{t("kicker")}</p>
        <h1 className="text-ink text-3xl font-bold">{t("title")}</h1>
        <p className="text-ink-muted text-sm">{t("subtitle")}</p>
      </header>

      {loading ? (
        <div className="flex flex-col gap-4" aria-busy="true" aria-label={tCommon("loading")}>
          <Skeleton className="h-24 w-full" />
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      ) : null}

      {!loading && error ? (
        <Alert
          kind="danger"
          action={
            <Button variant="ghost" size="sm" onClick={() => void load()}>
              {tCommon("retry")}
            </Button>
          }
        >
          {t("loadError")}
        </Alert>
      ) : null}

      {!loading && !error && hasPremium && subscription ? (
        <Alert
          kind={subscription.status === "PAST_DUE" ? "warning" : "success"}
          title={
            subscription.status === "PAST_DUE"
              ? t("current.pastDueTitle")
              : t("current.activeTitle")
          }
        >
          {subscription.status === "PAST_DUE"
            ? t("current.pastDueBody")
            : subscription.currentPeriodEnd
              ? t(subscription.cancelAtPeriodEnd ? "current.endsBody" : "current.renewsBody", {
                  date: dateFormatter.format(new Date(subscription.currentPeriodEnd)),
                })
              : t("current.activeTitle")}
        </Alert>
      ) : null}

      {!loading && !error && plan ? (
        <section className="grid gap-4 md:grid-cols-2">
          <Surface as="article" variant="flat" padding="6" className="flex flex-col gap-3">
            <div>
              <h2 className="text-ink text-lg font-semibold">{t("free.name")}</h2>
              <p className="text-ink-muted text-sm">{t("free.tagline")}</p>
            </div>
            <p className="text-ink text-3xl font-bold">{t("free.price")}</p>
            <FeatureList items={FREE_FEATURE_KEYS.map((key) => t(`free.features.${key}`))} />
          </Surface>

          <Surface
            as="article"
            variant="hero"
            padding="6"
            className="border-brand-600 flex flex-col gap-3"
          >
            <div>
              <h2 className="text-ink text-lg font-semibold">{t("plan.name")}</h2>
              <p className="text-ink-muted text-sm">{t("plan.tagline")}</p>
            </div>
            <div>
              <p className="text-ink text-3xl font-bold">
                {t("plan.perMonth", {
                  price: formatMoney(plan.displayAmountCents, plan.displayCurrency, locale),
                })}
              </p>
              {plan.displayCurrency !== plan.currency ? (
                <p className="text-ink-muted text-sm">
                  {t("plan.originalUsd", { price: plan.priceCents / 100 })}
                </p>
              ) : null}
            </div>
            <FeatureList items={PREMIUM_FEATURE_KEYS.map((key) => t(`plan.features.${key}`))} />
            {!hasPremium && !checkoutOpen ? (
              <Button variant="accent" size="lg" onClick={() => setCheckoutOpen(true)}>
                {t("cta")}
              </Button>
            ) : null}
          </Surface>
        </section>
      ) : null}

      {!loading && !error && plan && karama && checkoutOpen && !hasPremium ? (
        <CheckoutPanel
          plan={plan}
          wallets={catalog?.wallets ?? []}
          bankTransfer={catalog?.bankTransfer ?? null}
          karama={karama}
          onActivated={() => void load()}
        />
      ) : null}

      {!loading && !error && invoices.length > 0 ? (
        <InvoiceList
          invoices={invoices}
          bankTransfer={catalog?.bankTransfer ?? null}
          onChanged={() => void load()}
        />
      ) : null}
    </main>
  );
}

function FeatureList({ items }: { items: string[] }): JSX.Element {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <li key={item} className="text-ink flex items-start gap-2 text-sm">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-brand-600 mt-0.5 h-4 w-4 shrink-0"
            aria-hidden="true"
          >
            <path d="m5 13 4 4 10-12" />
          </svg>
          {item}
        </li>
      ))}
    </ul>
  );
}
