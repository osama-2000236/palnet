import {
  formatDate,
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
import { Alert, Button, Surface } from "@baydar/ui-native";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert as RNAlert, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { z } from "zod";

import { CheckoutPanel } from "@/components/billing/CheckoutPanel";
import { InvoiceList } from "@/components/billing/InvoiceList";
import { CardStackSkeleton } from "@/components/ScreenSkeleton";

import { FeatureList, TRUST_KEYS, TrustRow, useStyles } from "@/screens/premium/parts";
import { apiFetch } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-errors";

const InvoicesResponse = z.array(Invoice);

const FREE_FEATURE_KEYS = ["profile", "connect", "jobs"] as const;
const PREMIUM_FEATURE_KEYS = ["analytics", "whoViewed", "diasporaBadge"] as const;

export default function PremiumScreen(): JSX.Element {
  const styles = useStyles();
  const { i18n, t } = useTranslation();

  const [catalog, setCatalog] = useState<BillingCatalogDto | null>(null);
  const [billingMe, setBillingMe] = useState<BillingMeDto | null>(null);
  const [karama, setKarama] = useState<KaramaBalanceDto | null>(null);
  const [invoices, setInvoices] = useState<InvoiceDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);

  const load = useCallback(async (): Promise<void> => {
    setError(null);
    try {
      const [nextCatalog, nextMe, nextKarama, nextInvoices] = await Promise.all([
        apiFetch("/billing/catalog", BillingCatalog),
        apiFetch("/billing/me", BillingMe),
        apiFetch("/karama/balance", KaramaBalance),
        apiFetch("/billing/invoices", InvoicesResponse),
      ]);
      setCatalog(nextCatalog);
      setBillingMe(nextMe);
      setKarama(nextKarama);
      // Personal scope only — company invoices live on the employer billing screen.
      setInvoices(nextInvoices.filter((invoice) => invoice.userId !== null));
    } catch (caught) {
      setError(apiErrorMessage(t, caught));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  // Stopping a renewal is reversible (resubscribe) and not destructive, so the
  // OS two-button confirm is enough — the account-delete Modal idiom is for
  // things you cannot undo.
  const cancel = useCallback((): void => {
    RNAlert.alert(t("premium.cancel.action"), t("premium.cancel.confirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("premium.cancel.action"),
        style: "destructive",
        onPress: () => {
          setCancelBusy(true);
          void apiFetch("/billing/me/cancel", BillingMe, { method: "POST" })
            .then(setBillingMe)
            .catch((caught: unknown) => setError(apiErrorMessage(t, caught)))
            .finally(() => setCancelBusy(false));
        },
      },
    ]);
  }, [t]);

  const plan = catalog?.plans.find((entry) => entry.code === PlanCode.USER_PREMIUM) ?? null;
  const subscription = billingMe?.subscription ?? null;
  const hasPremium = subscription !== null && subscription.plan?.code === PlanCode.USER_PREMIUM;

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
          <Text accessibilityRole="header" style={styles.kicker}>
            {t("premium.kicker")}
          </Text>
          <Text style={styles.title}>{t("premium.title")}</Text>
          <Text style={styles.subtitle}>{t("premium.subtitle")}</Text>
        </View>

        {error ? (
          <Alert
            body={t("premium.loadError")}
            kind="danger"
            cta={t("common.retry")}
            onAction={() => void load()}
          />
        ) : null}

        {!error && hasPremium && subscription ? (
          <Alert
            kind={subscription.status === "PAST_DUE" ? "warning" : "success"}
            title={
              subscription.status === "PAST_DUE"
                ? t("premium.current.pastDueTitle")
                : t("premium.current.activeTitle")
            }
            body={
              subscription.status === "PAST_DUE"
                ? t("premium.current.pastDueBody")
                : subscription.currentPeriodEnd
                  ? t(
                      subscription.cancelAtPeriodEnd
                        ? "premium.current.endsBody"
                        : "premium.current.renewsBody",
                      { date: formatDate(subscription.currentPeriodEnd, i18n.language) },
                    )
                  : t("premium.current.activeTitle")
            }
          />
        ) : null}

        {!error && hasPremium && subscription && !subscription.cancelAtPeriodEnd ? (
          <Button
            variant="ghost"
            size="sm"
            loading={cancelBusy}
            onPress={cancel}
            accessibilityLabel={t("premium.cancel.action")}
          >
            {t("premium.cancel.action")}
          </Button>
        ) : null}

        {!error && plan ? (
          <>
            <Surface variant="flat" padding="5" style={styles.planCard}>
              <Text style={styles.planName}>{t("premium.free.name")}</Text>
              <Text style={styles.planTagline}>{t("premium.free.tagline")}</Text>
              <Text style={styles.planPrice}>{t("premium.free.price")}</Text>
              <FeatureList
                items={FREE_FEATURE_KEYS.map((key) => t(`premium.free.features.${key}`))}
              />
            </Surface>

            <Surface variant="hero" padding="5" style={[styles.planCard, styles.premiumCard]}>
              <View style={styles.planHeader}>
                <Text style={styles.planName}>{t("premium.plan.name")}</Text>
                {/* The only badge on the screen — comparison emphasis comes
                 * from one plan being marked, not from both shouting. */}
                <Text style={styles.recommended}>{t("premium.plan.recommended")}</Text>
              </View>
              <Text style={styles.planTagline}>{t("premium.plan.tagline")}</Text>
              <Text style={styles.planPrice}>
                {t("premium.plan.perMonth", {
                  price: formatMoney(plan.displayAmountCents, plan.displayCurrency, i18n.language),
                })}
              </Text>
              {plan.displayCurrency !== plan.currency ? (
                <Text style={styles.planOriginal}>
                  {t("premium.plan.originalUsd", { price: plan.priceCents / 100 })}
                </Text>
              ) : null}
              <FeatureList
                items={PREMIUM_FEATURE_KEYS.map((key) => t(`premium.plan.features.${key}`))}
              />
              {!hasPremium && !checkoutOpen ? (
                <>
                  <Button
                    variant="accent"
                    size="lg"
                    onPress={() => setCheckoutOpen(true)}
                    accessibilityLabel={t("premium.cta")}
                  >
                    {t("premium.cta")}
                  </Button>
                  <Text style={styles.guarantee}>{t("premium.guarantee")}</Text>
                </>
              ) : null}
            </Surface>

            <Surface variant="tinted" padding="4" style={styles.trustCard}>
              {TRUST_KEYS.map(({ key, icon }) => (
                <TrustRow
                  key={key}
                  icon={icon}
                  title={t(`premium.trust.${key}.title`)}
                  body={t(`premium.trust.${key}.body`)}
                />
              ))}
            </Surface>
          </>
        ) : null}

        {!error && plan && checkoutOpen && !hasPremium ? (
          <CheckoutPanel
            plan={plan}
            wallets={catalog?.wallets ?? []}
            bankTransfer={catalog?.bankTransfer ?? null}
            karama={karama}
            onActivated={() => void load()}
          />
        ) : null}

        {!error && invoices.length > 0 ? (
          <InvoiceList
            invoices={invoices}
            bankTransfer={catalog?.bankTransfer ?? null}
            onChanged={() => void load()}
          />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
