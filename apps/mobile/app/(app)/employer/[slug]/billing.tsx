import {
  formatDate,
  formatMoney,
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
import { Alert, Button, Icon, Surface, useThemeTokens } from "@baydar/ui-native";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { z } from "zod";

import { CheckoutPanel } from "@/components/billing/CheckoutPanel";
import { InvoiceList } from "@/components/billing/InvoiceList";
import { CardStackSkeleton } from "@/components/ScreenSkeleton";
import { apiFetch } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-errors";
import { useCompanyBillingStyles } from "@/styles/company-billing";

const InvoicesResponse = z.array(Invoice);

const UPGRADE_PLAN_CODES: PlanCode[] = [
  PlanCode.EMPLOYER_BASIC,
  PlanCode.EMPLOYER_PRO,
  PlanCode.FEATURED_SLOT,
];

const FEATURE_LABEL_KEYS = [
  "activeJobs",
  "applicantInbox",
  "basicAnalytics",
  "advancedAnalytics",
  "csvExport",
  "featuredSlots",
  "durationDays",
] as const;

export default function CompanyBillingScreen(): JSX.Element {
  const styles = useCompanyBillingStyles();
  const { i18n, t } = useTranslation();
  const { slug } = useLocalSearchParams<{ slug: string }>();

  const [company, setCompany] = useState<CompanyDto | null>(null);
  const [summary, setSummary] = useState<CompanyBillingSummaryDto | null>(null);
  const [catalog, setCatalog] = useState<BillingCatalogDto | null>(null);
  const [invoices, setInvoices] = useState<InvoiceDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanOfferDto | null>(null);

  const load = useCallback(async (): Promise<void> => {
    if (!slug) return;
    setError(null);
    try {
      const nextCompany = await apiFetch(`/companies/${encodeURIComponent(slug)}`, Company);
      const [nextSummary, nextCatalog, nextInvoices] = await Promise.all([
        apiFetch(`/billing/companies/${nextCompany.id}/summary`, CompanyBillingSummary),
        apiFetch("/billing/catalog", BillingCatalog),
        apiFetch("/billing/invoices", InvoicesResponse),
      ]);
      setCompany(nextCompany);
      setSummary(nextSummary);
      setCatalog(nextCatalog);
      setInvoices(nextInvoices.filter((invoice) => invoice.companyId === nextCompany.id));
    } catch (caught) {
      setError(apiErrorMessage(t, caught));
    } finally {
      setLoading(false);
    }
  }, [slug, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const currentPlanCode = summary?.subscription?.plan?.code ?? PlanCode.EMPLOYER_FREE;
  const upgradePlans = (catalog?.plans ?? []).filter((plan) =>
    UPGRADE_PLAN_CODES.includes(plan.code),
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.screen}>
        <CardStackSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollBody}>
        <View>
          <Text style={styles.kicker}>{company?.name ?? slug}</Text>
          <Text accessibilityRole="header" style={styles.title}>
            {t("billing.employer.title")}
          </Text>
          <Text style={styles.subtitle}>{t("billing.employer.subtitle")}</Text>
        </View>

        {error ? (
          <Alert
            body={t("billing.employer.loadError")}
            kind="danger"
            cta={t("common.retry")}
            onAction={() => void load()}
          />
        ) : null}

        {!error && summary ? (
          <>
            <Surface variant="flat" padding="5" style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>{t("billing.employer.currentPlan")}</Text>
              <Text style={styles.summaryValue}>{t(`billing.plans.${currentPlanCode}`)}</Text>
              {summary.subscription?.status === "PAST_DUE" ? (
                <Text style={styles.warnText}>{t("billing.employer.pastDueBody")}</Text>
              ) : summary.subscription?.currentPeriodEnd ? (
                <Text style={styles.bodyText}>
                  {t(
                    summary.subscription.cancelAtPeriodEnd
                      ? "billing.employer.endsBody"
                      : "billing.employer.renewsBody",
                    { date: formatDate(summary.subscription.currentPeriodEnd, i18n.language) },
                  )}
                </Text>
              ) : null}

              <Text style={[styles.summaryLabel, styles.summarySpacer]}>
                {t("billing.employer.jobSlots")}
              </Text>
              <Text style={styles.summaryValue}>
                {t("billing.employer.jobSlotsValue", {
                  used: summary.activeJobs,
                  limit: summary.jobLimit,
                })}
              </Text>

              <Text style={[styles.summaryLabel, styles.summarySpacer]}>
                {t("billing.employer.credits")}
              </Text>
              {summary.credits.length === 0 ? (
                <Text style={styles.bodyText}>{t("billing.employer.noCredits")}</Text>
              ) : (
                summary.credits.map((credit, index) => (
                  <Text key={`${credit.kind}-${index}`} style={styles.bodyText}>
                    {credit.remaining}× {t(`billing.employer.creditKinds.${credit.kind}`)}
                    {credit.expiresAt
                      ? ` · ${t("billing.employer.expires", { date: formatDate(credit.expiresAt, i18n.language) })}`
                      : ""}
                  </Text>
                ))
              )}
            </Surface>

            <Text style={styles.sectionTitle}>{t("billing.employer.choosePlan")}</Text>
            {upgradePlans.map((plan) => {
              const isCurrent = plan.code === currentPlanCode;
              const isSelected = selectedPlan?.code === plan.code;
              return (
                <Surface
                  key={plan.code}
                  variant={isSelected ? "hero" : "flat"}
                  padding="5"
                  style={[styles.planCard, isSelected && styles.selectedPlanCard]}
                >
                  <Text style={styles.planName}>{t(`billing.plans.${plan.code}`)}</Text>
                  <Text style={styles.planPrice}>
                    {t(
                      plan.intervalDays === null
                        ? "billing.employer.oneTime"
                        : "billing.employer.perMonth",
                      {
                        price: formatMoney(
                          plan.displayAmountCents,
                          plan.displayCurrency,
                          i18n.language,
                        ),
                      },
                    )}
                  </Text>
                  {plan.displayCurrency !== plan.currency ? (
                    <Text style={styles.bodyText}>
                      {t("billing.employer.originalUsd", { price: plan.priceCents / 100 })}
                    </Text>
                  ) : null}
                  <FeatureList features={plan.features} />
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={isCurrent}
                    onPress={() => setSelectedPlan(isSelected ? null : plan)}
                    accessibilityLabel={
                      isSelected ? t("billing.employer.selected") : t("billing.employer.select")
                    }
                  >
                    {isSelected ? t("billing.employer.selected") : t("billing.employer.select")}
                  </Button>
                </Surface>
              );
            })}

            {selectedPlan && company ? (
              <CheckoutPanel
                plan={selectedPlan}
                companyId={company.id}
                wallets={catalog?.wallets ?? []}
                bankTransfer={catalog?.bankTransfer ?? null}
                onActivated={() => void load()}
              />
            ) : null}

            <InvoiceList
              invoices={invoices}
              bankTransfer={catalog?.bankTransfer ?? null}
              onChanged={() => void load()}
            />
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function FeatureList({ features }: { features: Record<string, unknown> }): JSX.Element {
  const c = useThemeTokens().color;
  const styles = useCompanyBillingStyles();
  const { t } = useTranslation();
  const items = FEATURE_LABEL_KEYS.flatMap((key) => {
    const value = features[key];
    if (value === undefined || value === false || value === 0) return [];
    return [t(`billing.features.${key}`, { count: typeof value === "number" ? value : 1 })];
  });
  return (
    <View style={styles.featureList}>
      {items.map((item) => (
        <View key={item} style={styles.featureRow}>
          <Icon name="check" size={16} color={c.brand600} />
          <Text style={styles.featureItem}>{item}</Text>
        </View>
      ))}
    </View>
  );
}
