"use client";

import {
  BillingCatalog,
  Company,
  CompanyBillingSummary,
  Invoice,
  PlanCode,
  type BillingCatalog as BillingCatalogDto,
  type Company as CompanyDto,
  type CompanyBillingSummary as CompanyBillingSummaryDto,
  type Invoice as InvoiceDto,
  type PlanOffer as PlanOfferDto,
} from "@baydar/shared";
import { Alert, Button, Skeleton, Surface } from "@baydar/ui-web";
import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { z } from "zod";

import { CheckoutPanel } from "@/components/billing/CheckoutPanel";
import { InvoiceList } from "@/components/billing/InvoiceList";
import { apiFetch, getValidAccessToken } from "@/lib/api";
import { toErrorMessage } from "@/lib/error-message";
import { formatMoney } from "@/lib/money";

const InvoicesResponse = z.array(Invoice);

// Employer plans offered for upgrade, in display order. EMPLOYER_FREE is the
// implicit baseline; FEATURED_SLOT is a one-time purchase.
const UPGRADE_PLAN_CODES: PlanCode[] = [
  PlanCode.EMPLOYER_BASIC,
  PlanCode.EMPLOYER_PRO,
  PlanCode.FEATURED_SLOT,
];

// plan.features keys we know how to label. Object values render a count.
const FEATURE_LABEL_KEYS = [
  "activeJobs",
  "applicantInbox",
  "basicAnalytics",
  "advancedAnalytics",
  "csvExport",
  "featuredSlots",
  "durationDays",
] as const;

export default function CompanyBillingPage(): JSX.Element {
  const t = useTranslations("billing.employer");
  const tBilling = useTranslations("billing");
  const tErrors = useTranslations("errors");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [company, setCompany] = useState<CompanyDto | null>(null);
  const [summary, setSummary] = useState<CompanyBillingSummaryDto | null>(null);
  const [catalog, setCatalog] = useState<BillingCatalogDto | null>(null);
  const [invoices, setInvoices] = useState<InvoiceDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanOfferDto | null>(null);

  const load = useCallback(async (): Promise<void> => {
    const token = await getValidAccessToken();
    if (!token) return;
    setError(null);
    try {
      const nextCompany = await apiFetch(`/companies/${encodeURIComponent(slug)}`, Company, {
        token,
      });
      const [nextSummary, nextCatalog, nextInvoices] = await Promise.all([
        apiFetch(`/billing/companies/${nextCompany.id}/summary`, CompanyBillingSummary, {
          token,
        }),
        apiFetch("/billing/catalog", BillingCatalog, { token }),
        apiFetch("/billing/invoices", InvoicesResponse, { token }),
      ]);
      setCompany(nextCompany);
      setSummary(nextSummary);
      setCatalog(nextCatalog);
      setInvoices(nextInvoices.filter((invoice) => invoice.companyId === nextCompany.id));
    } catch (caught) {
      setError(toErrorMessage(caught, tErrors));
    } finally {
      setLoading(false);
    }
  }, [slug, tErrors]);

  useEffect(() => {
    void load();
  }, [load]);

  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: "long" });
  const currentPlanCode = summary?.subscription?.plan?.code ?? PlanCode.EMPLOYER_FREE;
  const upgradePlans = (catalog?.plans ?? []).filter((plan) =>
    UPGRADE_PLAN_CODES.includes(plan.code),
  );

  return (
    <main className="mx-auto flex w-full max-w-[960px] flex-col gap-5 px-6 py-8">
      <header className="flex flex-col gap-1">
        <p className="text-brand-700 text-sm font-semibold">{company?.name ?? slug}</p>
        <h1 className="text-ink text-3xl font-bold">{t("title")}</h1>
        <p className="text-ink-muted text-sm">{t("subtitle")}</p>
      </header>

      {loading ? (
        <div className="flex flex-col gap-4" aria-busy="true" aria-label={tCommon("loading")}>
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-56 w-full" />
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

      {!loading && !error && summary ? (
        <>
          <section className="grid gap-4 md:grid-cols-3">
            <Surface as="article" variant="flat" padding="5" className="flex flex-col gap-1">
              <p className="text-ink-muted text-sm">{t("currentPlan")}</p>
              <p className="text-ink text-xl font-bold">{tBilling(`plans.${currentPlanCode}`)}</p>
              {summary.subscription?.status === "PAST_DUE" ? (
                <p className="text-warning text-sm">{t("pastDueBody")}</p>
              ) : summary.subscription?.currentPeriodEnd ? (
                <p className="text-ink-muted text-sm">
                  {t(summary.subscription.cancelAtPeriodEnd ? "endsBody" : "renewsBody", {
                    date: dateFormatter.format(new Date(summary.subscription.currentPeriodEnd)),
                  })}
                </p>
              ) : null}
            </Surface>

            <Surface as="article" variant="flat" padding="5" className="flex flex-col gap-1">
              <p className="text-ink-muted text-sm">{t("jobSlots")}</p>
              <p className="text-ink text-xl font-bold">
                {t("jobSlotsValue", { used: summary.activeJobs, limit: summary.jobLimit })}
              </p>
            </Surface>

            <Surface as="article" variant="flat" padding="5" className="flex flex-col gap-1">
              <p className="text-ink-muted text-sm">{t("credits")}</p>
              {summary.credits.length === 0 ? (
                <p className="text-ink-muted text-sm">{t("noCredits")}</p>
              ) : (
                <ul className="flex flex-col gap-1">
                  {summary.credits.map((credit, index) => (
                    <li key={`${credit.kind}-${index}`} className="text-ink text-sm">
                      <span className="font-semibold">{credit.remaining}×</span>{" "}
                      {t(`creditKinds.${credit.kind}`)}
                      {credit.expiresAt ? (
                        <span className="text-ink-muted">
                          {" "}
                          ·{" "}
                          {t("expires", { date: dateFormatter.format(new Date(credit.expiresAt)) })}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </Surface>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="text-ink text-lg font-semibold">{t("choosePlan")}</h2>
            <div className="grid gap-4 md:grid-cols-3">
              {upgradePlans.map((plan) => {
                const isCurrent = plan.code === currentPlanCode;
                const isSelected = selectedPlan?.code === plan.code;
                return (
                  <Surface
                    key={plan.code}
                    as="article"
                    variant={isSelected ? "hero" : "flat"}
                    padding="5"
                    className={`flex flex-col gap-3 ${isSelected ? "border-brand-600" : ""}`}
                  >
                    <div>
                      <h3 className="text-ink text-base font-semibold">
                        {tBilling(`plans.${plan.code}`)}
                      </h3>
                      <p className="text-ink text-2xl font-bold">
                        {t(plan.intervalDays === null ? "oneTime" : "perMonth", {
                          price: formatMoney(plan.displayAmountCents, plan.displayCurrency, locale),
                        })}
                      </p>
                      {plan.displayCurrency !== plan.currency ? (
                        <p className="text-ink-muted text-xs">
                          {t("originalUsd", { price: plan.priceCents / 100 })}
                        </p>
                      ) : null}
                    </div>
                    <FeatureList features={plan.features} />
                    <Button
                      variant={isSelected ? "secondary" : "outline"}
                      size="sm"
                      disabled={isCurrent}
                      onClick={() => setSelectedPlan(isSelected ? null : plan)}
                      className="mt-auto self-start"
                    >
                      {isSelected ? t("selected") : t("select")}
                    </Button>
                  </Surface>
                );
              })}
            </div>

            {selectedPlan && company ? (
              <CheckoutPanel
                plan={selectedPlan}
                companyId={company.id}
                wallets={catalog?.wallets ?? []}
                bankTransfer={catalog?.bankTransfer ?? null}
                onActivated={() => void load()}
              />
            ) : null}
          </section>

          <InvoiceList
            invoices={invoices}
            bankTransfer={catalog?.bankTransfer ?? null}
            onChanged={() => void load()}
          />
        </>
      ) : null}
    </main>
  );
}

function FeatureList({ features }: { features: Record<string, unknown> }): JSX.Element {
  const t = useTranslations("billing.features");
  const items = FEATURE_LABEL_KEYS.flatMap((key) => {
    const value = features[key];
    if (value === undefined || value === false || value === 0) return [];
    return [t(key, { count: typeof value === "number" ? value : 1 })];
  });
  return (
    <ul className="flex flex-col gap-1.5">
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
