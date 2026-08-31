import { AppBand, Chip, Surface, SwitchRow, nativeTokens, useThemeTokens } from "@baydar/ui-native";
import { router } from "expo-router";
import { formatNumber } from "@baydar/shared";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, StatusBar, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  ROUND_SIZES,
  getInitialRankingPrefs,
  writeRankingPrefs,
  type RankingPrefs,
} from "@/lib/ranking";

type SettingsHref =
  | "/settings/account"
  | "/settings/notifications"
  | "/settings/appearance"
  | "/settings/privacy"
  | "/settings/security"
  | "/settings/blocked";

interface Item {
  href: SettingsHref;
  label: string;
  desc: string;
}

export default function SettingsLandingScreen(): JSX.Element {
  const c = useThemeTokens().color;
  const { t, i18n } = useTranslation();
  const [ranking, setRanking] = useState<RankingPrefs>(getInitialRankingPrefs);

  function updateRanking(patch: Partial<RankingPrefs>): void {
    const next = { ...ranking, ...patch };
    setRanking(next);
    // Fire-and-forget: the UI already reflects `next`, and a failed write only
    // costs the preference on the next cold start.
    void writeRankingPrefs(next);
  }
  const items: Item[] = [
    {
      href: "/settings/account",
      label: t("settings.items.account"),
      desc: t("settings.items.accountDesc"),
    },
    {
      href: "/settings/notifications",
      label: t("settings.items.notifications"),
      desc: t("settings.items.notificationsDesc"),
    },
    {
      href: "/settings/appearance",
      label: t("settings.items.appearance"),
      desc: t("settings.items.appearanceDesc"),
    },
    {
      href: "/settings/privacy",
      label: t("settings.items.privacy"),
      desc: t("settings.items.privacyDesc"),
    },
    {
      href: "/settings/security",
      label: t("settings.items.security"),
      desc: t("settings.items.securityDesc"),
    },
    {
      href: "/settings/blocked",
      label: t("settings.items.blocked"),
      desc: t("settings.items.blockedDesc"),
    },
  ];

  return (
    <SafeAreaView
      edges={["left", "right", "bottom"]}
      style={{ flex: 1, backgroundColor: c.surfaceMuted }}
    >
      <StatusBar barStyle="light-content" />
      <AppBand title={t("settings.title")} subtitle={t("settings.subtitle")} />
      <ScrollView
        contentContainerStyle={{ padding: nativeTokens.space[4], gap: nativeTokens.space[3] }}
      >
        {/* The ranking is a setting, not a secret. Round size bounds the feed,
            the explanation switch drives ProvenanceLine, and the off switch
            has to actually exist for the other two to be honest. */}
        <Surface variant="card" padding="4" style={{ gap: nativeTokens.space[3] }}>
          <SwitchRow
            checked={ranking.explainRanking}
            onChange={(value) => updateRanking({ explainRanking: value })}
            label={t("settings.explainRanking.label")}
            description={t("settings.explainRanking.hint")}
          />
          <SwitchRow
            checked={ranking.rankingOff}
            onChange={(value) => updateRanking({ rankingOff: value })}
            label={t("settings.rankingOff.label")}
            description={t("settings.rankingOff.hint")}
          />
          <View style={{ gap: nativeTokens.space[2] }}>
            <Text
              style={{
                color: c.ink,
                fontFamily: nativeTokens.type.family.sans,
                fontSize: nativeTokens.type.scale.body.size,
                lineHeight: nativeTokens.type.scale.body.line,
                fontWeight: "600",
                textAlign: "auto",
              }}
            >
              {t("settings.roundSize.label")}
            </Text>
            <View style={{ flexDirection: "row", gap: nativeTokens.space[2] }}>
              {ROUND_SIZES.map((size) => (
                <Chip
                  key={size}
                  selected={ranking.roundSize === size}
                  onPress={() => updateRanking({ roundSize: size })}
                  accessibilityLabel={t("settings.roundSize.value", { count: size })}
                >
                  {formatNumber(size, i18n.language)}
                </Chip>
              ))}
            </View>
            <Text
              style={{
                color: c.inkMuted,
                fontFamily: nativeTokens.type.family.body,
                fontSize: nativeTokens.type.scale.small.size,
                lineHeight: nativeTokens.type.scale.small.line,
                textAlign: "auto",
              }}
            >
              {t("settings.roundSize.hint")}
            </Text>
          </View>
        </Surface>

        <Surface variant="flat" padding="0">
          <View>
            {items.map((item, i) => (
              <Pressable
                key={item.href}
                accessibilityRole="link"
                accessibilityLabel={item.label}
                onPress={() => router.push(item.href)}
                style={({ pressed }) => ({
                  paddingVertical: nativeTokens.space[4],
                  paddingHorizontal: nativeTokens.space[4],
                  borderTopWidth: i > 0 ? 1 : 0,
                  borderTopColor: c.lineSoft,
                  opacity: pressed ? 0.85 : 1,
                  flexDirection: "row",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: nativeTokens.space[3],
                })}
              >
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    style={{
                      color: c.ink,
                      fontFamily: nativeTokens.type.family.sans,
                      fontSize: nativeTokens.type.scale.body.size,
                      lineHeight: nativeTokens.type.scale.body.line,
                      fontWeight: "600",
                      textAlign: "auto",
                    }}
                  >
                    {item.label}
                  </Text>
                  <Text
                    style={{
                      color: c.inkMuted,
                      fontFamily: nativeTokens.type.family.body,
                      fontSize: nativeTokens.type.scale.small.size,
                      lineHeight: nativeTokens.type.scale.small.line,
                      marginTop: 2,
                      textAlign: "auto",
                    }}
                  >
                    {item.desc}
                  </Text>
                </View>
                {/* No chevron: the row is already a labelled link, and a bare
                    glyph can't be mirrored reliably across RTL launches. */}
              </Pressable>
            ))}
          </View>
        </Surface>
      </ScrollView>
    </SafeAreaView>
  );
}
