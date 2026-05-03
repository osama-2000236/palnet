import { nativeTokens } from "@baydar/ui-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, Text, View } from "react-native";

import { setAppLocale } from "@/i18n";
import { normalizeLocale, type SupportedLocale } from "@/lib/locale";

const OPTIONS: SupportedLocale[] = ["ar-PS", "en"];

export function LanguageToggle(): JSX.Element {
  const { t, i18n } = useTranslation();
  const [busy, setBusy] = useState(false);
  const current = normalizeLocale(i18n.language);

  async function choose(locale: SupportedLocale): Promise<void> {
    if (locale === current || busy) return;
    setBusy(true);
    try {
      await setAppLocale(locale);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View
      accessibilityLabel={t("common.language")}
      style={{
        minHeight: nativeTokens.chrome.minHit,
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "flex-start",
        borderRadius: nativeTokens.radius.full,
        borderWidth: 1,
        borderColor: nativeTokens.color.lineHard,
        backgroundColor: nativeTokens.color.surface,
        padding: 3,
      }}
    >
      {OPTIONS.map((locale) => {
        const selected = locale === current;
        return (
          <Pressable
            key={locale}
            accessibilityRole="button"
            accessibilityState={{ selected, disabled: busy }}
            accessibilityLabel={locale === "ar-PS" ? t("common.arabic") : t("common.english")}
            disabled={busy}
            onPress={() => void choose(locale)}
            style={({ pressed }) => ({
              minWidth: 48,
              minHeight: 36,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: nativeTokens.radius.full,
              backgroundColor: selected ? nativeTokens.color.brand600 : "transparent",
              opacity: pressed && !selected ? 0.72 : 1,
              paddingHorizontal: nativeTokens.space[3],
            })}
          >
            <Text
              style={{
                color: selected ? nativeTokens.color.inkInverse : nativeTokens.color.inkMuted,
                fontFamily: nativeTokens.type.family.sans,
                fontSize: nativeTokens.type.scale.caption.size,
                fontWeight: "700",
                lineHeight: nativeTokens.type.scale.caption.line,
                textAlign: "center",
              }}
            >
              {locale === "ar-PS" ? "AR" : "EN"}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
