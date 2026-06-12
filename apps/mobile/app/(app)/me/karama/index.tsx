import {
  BillingMe,
  CheckoutSession,
  KaramaBalance,
  KaramaRedeemResult,
  KaramaReward,
  PaymentMethod,
  PlanCode,
  RedeemKaramaBody,
  type BillingMe as BillingMeDto,
  type KaramaBalance as KaramaBalanceDto,
  type KaramaReward as KaramaRewardDto,
} from "@baydar/shared";
import { Button, Surface, nativeTokens } from "@baydar/ui-native";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { StateMessage } from "@/components/StateMessage";
import { apiFetch } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-errors";
import { makeIdempotencyKey } from "@/lib/idempotency";

// PREMIUM_30D routes through the billing POINTS checkout so the redemption is
// recorded as an invoice + active subscription; the rest hit /karama/redeem.
const REWARDS: { reward: KaramaRewardDto; key: "boost" | "premium" | "featured"; cost: number }[] =
  [
    { reward: KaramaReward.BOOST_APPLICATION, key: "boost", cost: 100 },
    { reward: KaramaReward.PREMIUM_30D, key: "premium", cost: 500 },
    { reward: KaramaReward.FEATURED_PROFILE_7D, key: "featured", cost: 1000 },
  ];

export default function KaramaScreen(): JSX.Element {
  const { t } = useTranslation();
  const router = useRouter();
  const [balance, setBalance] = useState<KaramaBalanceDto | null>(null);
  const [billingMe, setBillingMe] = useState<BillingMeDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyReward, setBusyReward] = useState<KaramaRewardDto | null>(null);

  const load = useCallback(async (): Promise<void> => {
    setError(null);
    try {
      const [nextBalance, nextBillingMe] = await Promise.all([
        apiFetch("/karama/balance", KaramaBalance),
        apiFetch("/billing/me", BillingMe),
      ]);
      setBalance(nextBalance);
      setBillingMe(nextBillingMe);
    } catch (caught) {
      setError(apiErrorMessage(t, caught));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const hasPremium = billingMe?.subscription?.plan?.code === PlanCode.USER_PREMIUM;

  async function redeem(reward: KaramaRewardDto, key: "boost" | "premium" | "featured") {
    setBusyReward(reward);
    setError(null);
    setNotice(null);
    try {
      if (reward === KaramaReward.PREMIUM_30D) {
        await apiFetch("/billing/checkout-session", CheckoutSession, {
          method: "POST",
          body: {
            planCode: PlanCode.USER_PREMIUM,
            returnUrl: "https://baydar.ps/ar-PS/me/premium",
            method: PaymentMethod.POINTS,
          },
        });
      } else {
        const body = RedeemKaramaBody.parse({
          reward,
          idempotencyKey: makeIdempotencyKey(reward),
        });
        await apiFetch("/karama/redeem", KaramaRedeemResult, { method: "POST", body });
      }
      await load();
      setNotice(t("karama.redeemed", { reward: t(`karama.rewards.${key}.title`) }));
    } catch (caught) {
      setError(apiErrorMessage(t, caught));
    } finally {
      setBusyReward(null);
    }
  }

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
            {t("karama.kicker")}
          </Text>
          <Text style={styles.title}>{t("karama.title")}</Text>
          <Text style={styles.subtitle}>{t("karama.subtitle")}</Text>
        </View>

        {error ? (
          <StateMessage
            message={error}
            tone="error"
            actionLabel={t("common.retry")}
            onAction={() => void load()}
          />
        ) : null}
        {notice ? <StateMessage role="text" tone="success" message={notice} /> : null}

        <Surface variant="tinted" padding="4" style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>{t("karama.balance")}</Text>
          <Text style={styles.balanceValue}>{balance?.balance ?? 0}</Text>
          <Text style={styles.balanceLabel}>{t("karama.cap", { cap: balance?.cap ?? 5000 })}</Text>
        </Surface>

        {REWARDS.map((item) => {
          const isPremium = item.reward === KaramaReward.PREMIUM_30D;
          const premiumBlocked = isPremium && hasPremium;
          const disabled =
            !balance || balance.balance < item.cost || busyReward !== null || premiumBlocked;
          return (
            <Surface key={item.reward} variant="card" padding="4" style={styles.rewardCard}>
              <Text style={styles.rewardTitle}>{t(`karama.rewards.${item.key}.title`)}</Text>
              <Text style={styles.rewardBody}>{t(`karama.rewards.${item.key}.body`)}</Text>
              <Text style={styles.rewardCost}>{t("karama.points", { count: item.cost })}</Text>
              {premiumBlocked ? (
                <>
                  <Text style={styles.rewardBody}>{t("karama.premiumActive")}</Text>
                  <Button
                    variant="secondary"
                    size="md"
                    onPress={() => router.push("/(app)/me/premium" as never)}
                    accessibilityLabel={t("karama.premiumLink")}
                  >
                    {t("karama.premiumLink")}
                  </Button>
                </>
              ) : (
                <Button
                  variant="primary"
                  size="md"
                  disabled={disabled}
                  loading={busyReward === item.reward}
                  onPress={() => void redeem(item.reward, item.key)}
                  accessibilityLabel={t("karama.redeem")}
                >
                  {t("karama.redeem")}
                </Button>
              )}
            </Surface>
          );
        })}

        <Surface variant="flat" padding="4" style={styles.ledger}>
          <Text style={styles.sectionTitle}>{t("karama.recent")}</Text>
          {(balance?.recent ?? []).map((entry) => (
            <View key={entry.id} style={styles.ledgerRow}>
              <Text style={styles.ledgerReason}>{t(`karama.reasons.${entry.reason}`)}</Text>
              <Text
                style={[styles.ledgerDelta, entry.delta < 0 ? styles.negative : styles.positive]}
              >
                {entry.delta > 0 ? "+" : ""}
                {entry.delta}
              </Text>
            </View>
          ))}
        </Surface>
      </ScrollView>
    </SafeAreaView>
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
  balanceCard: {
    gap: nativeTokens.space[1],
  },
  balanceLabel: {
    color: nativeTokens.color.inkMuted,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.small.size,
    lineHeight: nativeTokens.type.scale.small.line,
  },
  balanceValue: {
    color: nativeTokens.color.ink,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.display.size,
    lineHeight: nativeTokens.type.scale.display.line,
    fontWeight: "800",
  },
  rewardCard: {
    gap: nativeTokens.space[2],
  },
  rewardTitle: {
    color: nativeTokens.color.ink,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.h3.size,
    lineHeight: nativeTokens.type.scale.h3.line,
    fontWeight: "700",
  },
  rewardBody: {
    color: nativeTokens.color.inkMuted,
    fontFamily: nativeTokens.type.family.body,
    fontSize: nativeTokens.type.scale.small.size,
    lineHeight: nativeTokens.type.scale.small.line,
  },
  rewardCost: {
    color: nativeTokens.color.brand700,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.small.size,
    lineHeight: nativeTokens.type.scale.small.line,
    fontWeight: "700",
  },
  ledger: {
    gap: nativeTokens.space[2],
  },
  sectionTitle: {
    color: nativeTokens.color.ink,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.h3.size,
    lineHeight: nativeTokens.type.scale.h3.line,
    fontWeight: "700",
  },
  ledgerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: nativeTokens.space[3],
    paddingVertical: nativeTokens.space[2],
    borderTopWidth: 1,
    borderTopColor: nativeTokens.color.lineSoft,
  },
  ledgerReason: {
    flex: 1,
    color: nativeTokens.color.ink,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.small.size,
    lineHeight: nativeTokens.type.scale.small.line,
  },
  ledgerDelta: {
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.small.size,
    lineHeight: nativeTokens.type.scale.small.line,
    fontWeight: "700",
  },
  positive: {
    color: nativeTokens.color.brand700,
  },
  negative: {
    color: nativeTokens.color.danger,
  },
});
