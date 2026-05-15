import {
  KaramaBalance,
  KaramaRedeemResult,
  KaramaReward,
  RedeemKaramaBody,
  type KaramaBalance as KaramaBalanceDto,
  type KaramaReward as KaramaRewardDto,
} from "@baydar/shared";
import { Button, Surface, nativeTokens } from "@baydar/ui-native";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { StateMessage } from "@/components/StateMessage";
import { apiFetch } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-errors";

const REWARDS: { reward: KaramaRewardDto; key: string; cost: number }[] = [
  { reward: KaramaReward.BOOST_APPLICATION, key: "boost", cost: 100 },
  { reward: KaramaReward.PREMIUM_30D, key: "premium", cost: 500 },
  { reward: KaramaReward.FEATURED_PROFILE_7D, key: "featured", cost: 1000 },
];

export default function KaramaScreen(): JSX.Element {
  const { t } = useTranslation();
  const [balance, setBalance] = useState<KaramaBalanceDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyReward, setBusyReward] = useState<KaramaRewardDto | null>(null);

  const load = useCallback(async (): Promise<void> => {
    setError(null);
    try {
      setBalance(await apiFetch("/karama/balance", KaramaBalance));
    } catch (caught) {
      setError(apiErrorMessage(t, caught));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function redeem(reward: KaramaRewardDto): Promise<void> {
    const body = RedeemKaramaBody.parse({
      reward,
      idempotencyKey: `${reward}-${Date.now()}`,
    });
    setBusyReward(reward);
    setError(null);
    try {
      const result = await apiFetch("/karama/redeem", KaramaRedeemResult, {
        method: "POST",
        body,
      });
      setBalance((current) => (current ? { ...current, balance: result.balance } : current));
      await load();
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
            Karama Points
          </Text>
          <Text style={styles.title}>Reputation is earned</Text>
          <Text style={styles.subtitle}>Spend trusted reputation on visibility boosts.</Text>
        </View>

        {error ? (
          <StateMessage
            message={error}
            actionLabel={t("common.retry")}
            onAction={() => void load()}
          />
        ) : null}

        <Surface variant="tinted" padding="4" style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Balance</Text>
          <Text style={styles.balanceValue}>{balance?.balance ?? 0}</Text>
          <Text style={styles.balanceLabel}>Cap {balance?.cap ?? 5000}</Text>
        </Surface>

        {REWARDS.map((item) => {
          const disabled = !balance || balance.balance < item.cost || busyReward !== null;
          return (
            <Surface key={item.reward} variant="card" padding="4" style={styles.rewardCard}>
              <Text style={styles.rewardTitle}>{rewardTitle(item.key)}</Text>
              <Text style={styles.rewardBody}>{rewardBody(item.key)}</Text>
              <Text style={styles.rewardCost}>{item.cost} points</Text>
              <Button
                variant="primary"
                size="md"
                disabled={disabled}
                loading={busyReward === item.reward}
                onPress={() => void redeem(item.reward)}
                accessibilityLabel={`Redeem ${rewardTitle(item.key)}`}
              >
                Redeem
              </Button>
            </Surface>
          );
        })}

        <Surface variant="flat" padding="4" style={styles.ledger}>
          <Text style={styles.sectionTitle}>Recent activity</Text>
          {(balance?.recent ?? []).map((entry) => (
            <View key={entry.id} style={styles.ledgerRow}>
              <Text style={styles.ledgerReason}>{entry.reason.replaceAll("_", " ")}</Text>
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

function rewardTitle(key: string): string {
  if (key === "boost") return "Boost application";
  if (key === "premium") return "Premium month";
  return "Featured profile";
}

function rewardBody(key: string): string {
  if (key === "boost") return "Top of employer inbox for 48 hours.";
  if (key === "premium") return "Unlock premium profile visibility for 30 days.";
  return "Pin your profile in skill search for 7 days.";
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
    fontSize: 48,
    lineHeight: 56,
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
