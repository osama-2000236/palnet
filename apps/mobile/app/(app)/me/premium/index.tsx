import {
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
import {
  Button,
  Icon,
  Surface,
  nativeTokens,
  useThemeTokens,
  type NativeTheme,
} from "@baydar/ui-native";
import { useCallback, useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { z } from "zod";

import { CheckoutPanel } from "@/components/billing/CheckoutPanel";
import { InvoiceList } from "@/components/billing/InvoiceList";
import { StateMessage } from "@/components/StateMessage";
import { apiFetch } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-errors";
import { formatDate, formatMoney } from "@/lib/money";

const InvoicesResponse = z.array(Invoice);

const FREE_FEATURE_KEYS = ["profile", "connect", "jobs"] as const;
const PREMIUM_FEATURE_KEYS = ["analytics", "whoViewed", "diasporaBadge"] as const;

export default function PremiumScreen(): JSX.Element {
  const styles = useStyles();
  const { t } = useTranslation();

  const [catalog, setCatalog] = useState<BillingCatalogDto | null>(null);
  const [billingMe, setBillingMe] = useState<BillingMeDto | null>(null);
  const [karama, setKarama] = useState<KaramaBalanceDto | null>(null);
  const [invoices, setInvoices] = useState<InvoiceDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

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

  const plan = catalog?.plans.find((entry) => entry.code === PlanCode.USER_PREMIUM) ?? null;
  const subscription = billingMe?.subscription ?? null;
  const hasPremium = subscription !== null && subscription.plan?.code === PlanCode.USER_PREMIUM;

  if (loading) {
    return (
      <SafeAreaView style={styles.centerScreen}>
        <StateMessage message={t("common.loading")} role="text" />
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
          <StateMessage
            message={t("premium.loadError")}
            tone="error"
            actionLabel={t("common.retry")}
            onAction={() => void load()}
          />
        ) : null}

        {!error && hasPremium && subscription ? (
          <StateMessage
            role="text"
            tone={subscription.status === "PAST_DUE" ? "offline" : "success"}
            title={
              subscription.status === "PAST_DUE"
                ? t("premium.current.pastDueTitle")
                : t("premium.current.activeTitle")
            }
            message={
              subscription.status === "PAST_DUE"
                ? t("premium.current.pastDueBody")
                : subscription.currentPeriodEnd
                  ? t(
                      subscription.cancelAtPeriodEnd
                        ? "premium.current.endsBody"
                        : "premium.current.renewsBody",
                      { date: formatDate(subscription.currentPeriodEnd) },
                    )
                  : t("premium.current.activeTitle")
            }
          />
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
              <Text style={styles.planName}>{t("premium.plan.name")}</Text>
              <Text style={styles.planTagline}>{t("premium.plan.tagline")}</Text>
              <Text style={styles.planPrice}>
                {t("premium.plan.perMonth", {
                  price: formatMoney(plan.displayAmountCents, plan.displayCurrency),
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
                <Button
                  variant="accent"
                  size="lg"
                  onPress={() => setCheckoutOpen(true)}
                  accessibilityLabel={t("premium.cta")}
                >
                  {t("premium.cta")}
                </Button>
              ) : null}
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

function FeatureList({ items }: { items: string[] }): JSX.Element {
  const c = useThemeTokens().color;
  const styles = useStyles();
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

function makeStyles(c: NativeTheme["color"]) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: c.surfaceMuted,
    },
    centerScreen: {
      flex: 1,
      justifyContent: "center",
      backgroundColor: c.surfaceMuted,
      padding: nativeTokens.space[4],
    },
    scrollBody: {
      padding: nativeTokens.space[4],
      gap: nativeTokens.space[4],
    },
    kicker: {
      color: c.brand700,
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.small.size,
      lineHeight: nativeTokens.type.scale.small.line,
      fontWeight: "700",
    },
    title: {
      color: c.ink,
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.h1.size,
      lineHeight: nativeTokens.type.scale.h1.line,
      fontWeight: "700",
    },
    subtitle: {
      color: c.inkMuted,
      fontFamily: nativeTokens.type.family.body,
      fontSize: nativeTokens.type.scale.small.size,
      lineHeight: nativeTokens.type.scale.small.line,
    },
    planCard: {
      gap: nativeTokens.space[2],
    },
    premiumCard: {
      borderColor: c.brand600,
    },
    planName: {
      color: c.ink,
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.h3.size,
      lineHeight: nativeTokens.type.scale.h3.line,
      fontWeight: "700",
    },
    planTagline: {
      color: c.inkMuted,
      fontFamily: nativeTokens.type.family.body,
      fontSize: nativeTokens.type.scale.small.size,
      lineHeight: nativeTokens.type.scale.small.line,
    },
    planPrice: {
      color: c.ink,
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.h2.size,
      lineHeight: nativeTokens.type.scale.h2.line,
      fontWeight: "800",
    },
    planOriginal: {
      color: c.inkMuted,
      fontFamily: nativeTokens.type.family.body,
      fontSize: nativeTokens.type.scale.small.size,
      lineHeight: nativeTokens.type.scale.small.line,
    },
    featureList: {
      gap: nativeTokens.space[2],
    },
    featureRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: nativeTokens.space[2],
    },
    featureItem: {
      flexShrink: 1,
      color: c.ink,
      fontFamily: nativeTokens.type.family.body,
      fontSize: nativeTokens.type.scale.small.size,
      lineHeight: nativeTokens.type.scale.small.line,
    },
  });
}

function useStyles() {
  const c = useThemeTokens().color;
  return useMemo(() => makeStyles(c), [c]);
}
