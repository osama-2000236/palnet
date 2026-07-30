import {
  BillingMe,
  CheckoutSession,
  CheckoutSessionBody,
  KaramaBalance,
  KARAMA_REWARD_COSTS,
  PaymentMethod,
  PlanCode,
  formatNumber,
  type BillingMe as BillingMeDto,
  type KaramaBalance as KaramaBalanceDto,
} from "@baydar/shared";
import { Alert, Button, Surface } from "@baydar/ui-native";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CardStackSkeleton } from "@/components/ScreenSkeleton";
import { apiFetch } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-errors";

import { useKaramaStyles } from "@/screens/karama/styles";

type Notice = { kind: "success" | "error"; text: string };

// One card, because premium is the only reward that grants anything — the two
// that did not are gone from `KaramaReward` in @baydar/shared.
const PREMIUM_COST = KARAMA_REWARD_COSTS.PREMIUM_30D;

export default function KaramaScreen(): JSX.Element {
  const styles = useKaramaStyles();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [balance, setBalance] = useState<KaramaBalanceDto | null>(null);
  const [billingMe, setBillingMe] = useState<BillingMeDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busy, setBusy] = useState(false);

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

  // Premium is bought through billing checkout, not `POST /karama/redeem`:
  // billing debits the points itself and is the only thing that can create the
  // subscription the points pay for.
  async function redeemPremiumWithPoints(): Promise<void> {
    setBusy(true);
    setNotice(null);
    try {
      const body = CheckoutSessionBody.parse({
        planCode: PlanCode.USER_PREMIUM,
        returnUrl: "https://baydar.ps/me/karama",
        method: PaymentMethod.POINTS,
      });
      await apiFetch("/billing/checkout-session", CheckoutSession, {
        method: "POST",
        body,
      });
      await load();
      setNotice({ kind: "success", text: t("karama.checkoutSuccess") });
    } catch (caught) {
      setNotice({ kind: "error", text: apiErrorMessage(t, caught) });
    } finally {
      setBusy(false);
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
          <Alert
            body={notice.text}
            kind={notice.kind === "error" ? "danger" : "success"}
            cta={notice.kind === "error" ? t("common.retry") : undefined}
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

        <Surface variant="card" padding="4" style={styles.rewardCard}>
          <View style={styles.rewardHeader}>
            <Text style={styles.rewardTitle}>{t("karama.rewards.premium.title")}</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{t("karama.checkoutBadge")}</Text>
            </View>
          </View>
          <Text style={styles.rewardBody}>{t("karama.rewards.premium.body")}</Text>
          <Text style={styles.rewardCost}>
            <Text style={styles.ltr}>{formatNumber(PREMIUM_COST, i18n.language)}</Text>{" "}
            {t("karama.points")}
          </Text>
          {hasPremium ? (
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
              disabled={!balance || balance.balance < PREMIUM_COST || busy}
              loading={busy}
              onPress={() => void redeemPremiumWithPoints()}
              accessibilityLabel={t("karama.redeemReward", {
                reward: t("karama.rewards.premium.title"),
              })}
            >
              {t("karama.redeem")}
            </Button>
          )}
        </Surface>

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
