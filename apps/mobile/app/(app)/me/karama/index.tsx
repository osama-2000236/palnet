import {
  BillingMe,
  CheckoutSession,
  CheckoutSessionBody,
  KaramaBalance,
  KaramaRedeemResult,
  KaramaReward,
  PaymentMethod,
  PlanCode,
  RedeemKaramaBody,
  formatNumber,
  type BillingMe as BillingMeDto,
  type KaramaBalance as KaramaBalanceDto,
  type KaramaReward as KaramaRewardDto,
} from "@baydar/shared";
import { Button, Surface } from "@baydar/ui-native";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CardStackSkeleton } from "@/components/ScreenSkeleton";
import { StateMessage } from "@/components/StateMessage";
import { apiFetch } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-errors";
import { makeIdempotencyKey } from "@/lib/idempotency";

import { KARAMA_REWARDS } from "@/screens/karama/data";
import { useKaramaStyles } from "@/screens/karama/styles";

type Notice = { kind: "success" | "error"; text: string };

export default function KaramaScreen(): JSX.Element {
  const styles = useKaramaStyles();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [balance, setBalance] = useState<KaramaBalanceDto | null>(null);
  const [billingMe, setBillingMe] = useState<BillingMeDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busyReward, setBusyReward] = useState<KaramaRewardDto | null>(null);

  const load = useCallback(async (): Promise<void> => {
    setNotice(null);
    try {
      const [nextBalance, nextBillingMe] = await Promise.all([
        apiFetch("/karama/balance", KaramaBalance),
        apiFetch("/billing/me", BillingMe),
      ]);
      setBalance(nextBalance);
      setBillingMe(nextBillingMe);
    } catch (caught) {
      setNotice({ kind: "error", text: apiErrorMessage(t, caught) });
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function redeemPremiumWithPoints(): Promise<void> {
    const body = CheckoutSessionBody.parse({
      planCode: PlanCode.USER_PREMIUM,
      returnUrl: "https://baydar.ps/me/karama",
      method: PaymentMethod.POINTS,
    });
    await apiFetch("/billing/checkout-session", CheckoutSession, {
      method: "POST",
      body,
    });
  }

  async function redeem(reward: KaramaRewardDto): Promise<void> {
    setBusyReward(reward);
    setNotice(null);
    try {
      if (reward === KaramaReward.PREMIUM_30D) {
        await redeemPremiumWithPoints();
      } else {
        const result = await apiFetch("/karama/redeem", KaramaRedeemResult, {
          method: "POST",
          body: RedeemKaramaBody.parse({
            reward,
            idempotencyKey: makeIdempotencyKey(reward),
          }),
        });
        setBalance((current) => (current ? { ...current, balance: result.balance } : current));
      }
      await load();
      setNotice({
        kind: "success",
        text:
          reward === KaramaReward.PREMIUM_30D
            ? t("karama.checkoutSuccess")
            : t("karama.redeemSuccess"),
      });
    } catch (caught) {
      setNotice({ kind: "error", text: apiErrorMessage(t, caught) });
    } finally {
      setBusyReward(null);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.screen}>
        <CardStackSkeleton />
      </SafeAreaView>
    );
  }

  const recent = balance?.recent ?? [];
  const hasPremium = billingMe?.subscription?.plan?.code === PlanCode.USER_PREMIUM;

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

        {notice ? (
          <StateMessage
            message={notice.text}
            tone={notice.kind}
            role={notice.kind === "error" ? "alert" : "text"}
            actionLabel={notice.kind === "error" ? t("common.retry") : undefined}
            onAction={notice.kind === "error" ? () => void load() : undefined}
          />
        ) : null}

        <Surface variant="tinted" padding="4" style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>{t("karama.balance")}</Text>
          <Text style={styles.balanceValue}>
            {formatNumber(balance?.balance ?? 0, i18n.language)}
          </Text>
          <Text style={styles.balanceLabel}>
            {t("karama.cap")}{" "}
            <Text style={styles.ltr}>{formatNumber(balance?.cap ?? 5000, i18n.language)}</Text>
          </Text>
        </Surface>

        {KARAMA_REWARDS.map((item) => {
          const isPremium = item.reward === KaramaReward.PREMIUM_30D;
          const disabled =
            !balance ||
            balance.balance < item.cost ||
            busyReward !== null ||
            (isPremium && hasPremium);
          return (
            <Surface key={item.reward} variant="card" padding="4" style={styles.rewardCard}>
              <View style={styles.rewardHeader}>
                <Text style={styles.rewardTitle}>{t(`karama.rewards.${item.key}.title`)}</Text>
                {isPremium ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{t("karama.checkoutBadge")}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.rewardBody}>{t(`karama.rewards.${item.key}.body`)}</Text>
              <Text style={styles.rewardCost}>
                <Text style={styles.ltr}>{formatNumber(item.cost, i18n.language)}</Text>{" "}
                {t("karama.points")}
              </Text>
              {isPremium && hasPremium ? (
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
                  variant={isPremium ? "primary" : "secondary"}
                  size="md"
                  disabled={disabled}
                  loading={busyReward === item.reward}
                  onPress={() => void redeem(item.reward)}
                  accessibilityLabel={t("karama.redeemReward", {
                    reward: t(`karama.rewards.${item.key}.title`),
                  })}
                >
                  {t("karama.redeem")}
                </Button>
              )}
            </Surface>
          );
        })}

        <Surface variant="flat" padding="4" style={styles.ledger}>
          <Text style={styles.sectionTitle}>{t("karama.recent")}</Text>
          {recent.length === 0 ? (
            <Text style={styles.rewardBody}>{t("karama.recentEmpty")}</Text>
          ) : (
            recent.map((entry) => (
              <View key={entry.id} style={styles.ledgerRow}>
                <Text style={styles.ledgerReason}>{t(`karama.reasons.${entry.reason}`)}</Text>
                <Text
                  style={[styles.ledgerDelta, entry.delta < 0 ? styles.negative : styles.positive]}
                >
                  {entry.delta > 0 ? "+" : ""}
                  {entry.delta}
                </Text>
              </View>
            ))
          )}
        </Surface>
      </ScrollView>
    </SafeAreaView>
  );
}
