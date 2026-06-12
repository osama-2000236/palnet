import {
  BillingCatalog,
  BillingMe,
  CheckoutSession,
  KaramaBalance,
  PaymentMethod,
  PlanCode,
  type BillingCatalog as BillingCatalogDto,
  type BillingMe as BillingMeDto,
  type CheckoutSession as CheckoutSessionDto,
  type KaramaBalance as KaramaBalanceDto,
} from "@baydar/shared";
import { Button, Icon, RadioGroup, Surface, nativeTokens } from "@baydar/ui-native";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { StateMessage } from "@/components/StateMessage";
import { apiFetch } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-errors";
import { formatDate, formatMoney } from "@/lib/money";

// Same returnUrl on web and mobile: HyperPay sends the shopper back to the
// premium page; the universal-link handler reopens the app when installed.
const CHECKOUT_RETURN_URL = "https://baydar.ps/ar-PS/me/premium";

const WALLET_METHOD_KEYS: Record<string, string> = {
  JAWWALPAY: "jawwalpay",
  PALPAY: "palpay",
  REFLECT: "reflect",
};

const FREE_FEATURE_KEYS = ["profile", "connect", "jobs"] as const;
const PREMIUM_FEATURE_KEYS = ["analytics", "whoViewed", "diasporaBadge"] as const;

export default function PremiumScreen(): JSX.Element {
  const { t } = useTranslation();

  const [catalog, setCatalog] = useState<BillingCatalogDto | null>(null);
  const [billingMe, setBillingMe] = useState<BillingMeDto | null>(null);
  const [karama, setKarama] = useState<KaramaBalanceDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [method, setMethod] = useState<PaymentMethod>(PaymentMethod.CARD);
  const [busy, setBusy] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [session, setSession] = useState<CheckoutSessionDto | null>(null);

  const load = useCallback(async (): Promise<void> => {
    setError(null);
    try {
      const [nextCatalog, nextMe, nextKarama] = await Promise.all([
        apiFetch("/billing/catalog", BillingCatalog),
        apiFetch("/billing/me", BillingMe),
        apiFetch("/karama/balance", KaramaBalance),
      ]);
      setCatalog(nextCatalog);
      setBillingMe(nextMe);
      setKarama(nextKarama);
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
  const pointsPrice = plan?.pointsPrice ?? null;
  const pointsAffordable = pointsPrice !== null && karama !== null && karama.balance >= pointsPrice;

  async function checkout(): Promise<void> {
    if (!plan) return;
    setBusy(true);
    setCheckoutError(null);
    setSession(null);
    try {
      const result = await apiFetch("/billing/checkout-session", CheckoutSession, {
        method: "POST",
        body: {
          planCode: plan.code,
          returnUrl: CHECKOUT_RETURN_URL,
          method,
        },
      });
      if (result.method === PaymentMethod.CARD) {
        if (result.checkoutUrl) {
          await Linking.openURL(result.checkoutUrl);
        } else {
          setCheckoutError(t("premium.checkout.cardError"));
        }
      } else {
        setSession(result);
        if (result.method === PaymentMethod.POINTS) await load();
      }
    } catch (caught) {
      setCheckoutError(
        method === PaymentMethod.CARD
          ? t("premium.checkout.cardError")
          : apiErrorMessage(t, caught),
      );
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.centerScreen}>
        <StateMessage message={t("common.loading")} role="text" />
      </SafeAreaView>
    );
  }

  const methodItems = plan
    ? [
        { value: PaymentMethod.CARD, label: t("premium.checkout.methods.card") },
        { value: PaymentMethod.BANK_TRANSFER, label: t("premium.checkout.methods.bankTransfer") },
        ...(pointsPrice !== null
          ? [
              {
                value: PaymentMethod.POINTS,
                label: t("premium.checkout.methods.points"),
                disabled: !pointsAffordable,
              },
            ]
          : []),
        ...(catalog?.wallets ?? []).map((wallet) => ({
          value: wallet.provider as PaymentMethod,
          label: wallet.configured
            ? t(`premium.checkout.methods.${WALLET_METHOD_KEYS[wallet.provider]}`)
            : `${t(`premium.checkout.methods.${WALLET_METHOD_KEYS[wallet.provider]}`)} — ${t(
                "premium.checkout.comingSoon",
              )}`,
          disabled: !wallet.configured,
        })),
      ]
    : [];

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
          session?.method === PaymentMethod.POINTS ? (
            <StateMessage
              role="text"
              tone="success"
              title={t("premium.checkout.pointsSuccess.title")}
              message={t("premium.checkout.pointsSuccess.body")}
            />
          ) : session?.bankTransfer ? (
            <Surface variant="tinted" padding="5" style={styles.bankCard}>
              <Text style={styles.sectionTitle}>{t("premium.checkout.bank.title")}</Text>
              <Text style={styles.bodyText}>{t("premium.checkout.bank.body")}</Text>
              <BankRow
                label={t("premium.checkout.bank.beneficiary")}
                value={session.bankTransfer.beneficiary}
              />
              <BankRow
                label={t("premium.checkout.bank.iban")}
                value={session.bankTransfer.iban}
                ltr
              />
              <BankRow
                label={t("premium.checkout.bank.reference")}
                value={session.bankTransfer.reference}
                ltr
              />
              <BankRow
                label={t("premium.checkout.bank.amount")}
                value={formatMoney(session.bankTransfer.amountCents, session.bankTransfer.currency)}
              />
              <Text style={styles.bodyText}>{t("premium.checkout.bank.due")}</Text>
            </Surface>
          ) : session?.wallet ? (
            <StateMessage role="text" message={session.wallet.instructions} />
          ) : (
            <Surface variant="flat" padding="5" style={styles.checkoutCard}>
              <Text style={styles.sectionTitle}>{t("premium.checkout.title")}</Text>
              <RadioGroup
                label={t("premium.checkout.title")}
                items={methodItems}
                value={method}
                onValueChange={(next) => setMethod(next as PaymentMethod)}
                disabled={busy}
              />
              {method === PaymentMethod.CARD ? (
                <Text style={styles.bodyText}>{t("premium.checkout.cardRedirect")}</Text>
              ) : null}
              {method === PaymentMethod.POINTS && pointsPrice !== null && karama ? (
                <Text style={styles.bodyText}>
                  {t("premium.checkout.pointsBalance", {
                    balance: karama.balance,
                    cost: pointsPrice,
                  })}
                </Text>
              ) : null}
              {pointsPrice !== null && !pointsAffordable ? (
                <Text style={styles.bodyText}>
                  {t("premium.checkout.pointsInsufficient", { cost: pointsPrice })}
                </Text>
              ) : null}
              {checkoutError ? <StateMessage message={checkoutError} tone="error" /> : null}
              <Button
                variant="primary"
                size="md"
                loading={busy}
                disabled={busy}
                onPress={() => void checkout()}
                accessibilityLabel={t("premium.checkout.confirm")}
              >
                {method === PaymentMethod.POINTS && pointsPrice !== null
                  ? t("premium.checkout.confirmPoints", { cost: pointsPrice })
                  : t("premium.checkout.confirm")}
              </Button>
            </Surface>
          )
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function FeatureList({ items }: { items: string[] }): JSX.Element {
  return (
    <View style={styles.featureList}>
      {items.map((item) => (
        <View key={item} style={styles.featureRow}>
          <Icon name="check" size={16} color={nativeTokens.color.brand600} />
          <Text style={styles.featureItem}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

function BankRow({
  label,
  value,
  ltr = false,
}: {
  label: string;
  value: string;
  ltr?: boolean;
}): JSX.Element {
  return (
    <View style={styles.bankRow}>
      <Text style={styles.bankLabel}>{label}</Text>
      <Text selectable style={[styles.bankValue, ltr && styles.ltrValue]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: nativeTokens.color.surfaceMuted,
  },
  centerScreen: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: nativeTokens.color.surfaceMuted,
    padding: nativeTokens.space[4],
  },
  scrollBody: {
    padding: nativeTokens.space[4],
    gap: nativeTokens.space[4],
  },
  kicker: {
    color: nativeTokens.color.brand700,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.small.size,
    lineHeight: nativeTokens.type.scale.small.line,
    fontWeight: "700",
  },
  title: {
    color: nativeTokens.color.ink,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.h1.size,
    lineHeight: nativeTokens.type.scale.h1.line,
    fontWeight: "700",
  },
  subtitle: {
    color: nativeTokens.color.inkMuted,
    fontFamily: nativeTokens.type.family.body,
    fontSize: nativeTokens.type.scale.small.size,
    lineHeight: nativeTokens.type.scale.small.line,
  },
  planCard: {
    gap: nativeTokens.space[2],
  },
  premiumCard: {
    borderColor: nativeTokens.color.brand600,
  },
  planName: {
    color: nativeTokens.color.ink,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.h3.size,
    lineHeight: nativeTokens.type.scale.h3.line,
    fontWeight: "700",
  },
  planTagline: {
    color: nativeTokens.color.inkMuted,
    fontFamily: nativeTokens.type.family.body,
    fontSize: nativeTokens.type.scale.small.size,
    lineHeight: nativeTokens.type.scale.small.line,
  },
  planPrice: {
    color: nativeTokens.color.ink,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.h2.size,
    lineHeight: nativeTokens.type.scale.h2.line,
    fontWeight: "800",
  },
  planOriginal: {
    color: nativeTokens.color.inkMuted,
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
    color: nativeTokens.color.ink,
    fontFamily: nativeTokens.type.family.body,
    fontSize: nativeTokens.type.scale.small.size,
    lineHeight: nativeTokens.type.scale.small.line,
  },
  checkoutCard: {
    gap: nativeTokens.space[3],
  },
  bankCard: {
    gap: nativeTokens.space[2],
  },
  sectionTitle: {
    color: nativeTokens.color.ink,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.h3.size,
    lineHeight: nativeTokens.type.scale.h3.line,
    fontWeight: "700",
  },
  bodyText: {
    color: nativeTokens.color.inkMuted,
    fontFamily: nativeTokens.type.family.body,
    fontSize: nativeTokens.type.scale.small.size,
    lineHeight: nativeTokens.type.scale.small.line,
  },
  bankRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: nativeTokens.space[3],
    paddingVertical: nativeTokens.space[1],
  },
  bankLabel: {
    color: nativeTokens.color.inkMuted,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.small.size,
    lineHeight: nativeTokens.type.scale.small.line,
  },
  bankValue: {
    flexShrink: 1,
    color: nativeTokens.color.ink,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.small.size,
    lineHeight: nativeTokens.type.scale.small.line,
    fontWeight: "700",
  },
  ltrValue: {
    writingDirection: "ltr",
  },
});
