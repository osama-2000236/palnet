// CityField — native twin of apps/web/src/components/CityField.tsx.
// Curated Palestinian city picker (docs/localization-palestine.md): a field
// that opens a Sheet of city chips grouped by governorate, plus an "other
// city" free-text fallback. Writes the canonical Arabic city name.

import { PS_GOVERNORATES, normalizeCity } from "@baydar/shared";
import { Chip, Input, Sheet, nativeTokens } from "@baydar/ui-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, Text, View } from "react-native";

export interface CityFieldProps {
  value: string;
  onChange: (city: string) => void;
  /** Show an "all cities" clear chip (for filters). */
  allowEmpty?: boolean;
  disabled?: boolean;
  testID?: string;
}

export function CityField({
  value,
  onChange,
  allowEmpty = false,
  disabled = false,
  testID,
}: CityFieldProps): JSX.Element {
  const { i18n, t } = useTranslation();
  const isArabic = i18n.language.startsWith("ar");
  const [open, setOpen] = useState(false);
  const [other, setOther] = useState(false);

  return (
    <View style={{ gap: nativeTokens.space[1] }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("common.cityField.label")}
        accessibilityState={{ disabled }}
        disabled={disabled}
        testID={testID}
        onPress={() => setOpen(true)}
        style={{
          minHeight: nativeTokens.chrome.minHit,
          justifyContent: "center",
          paddingHorizontal: nativeTokens.space[3],
          borderRadius: nativeTokens.radius.md,
          borderWidth: 1,
          borderColor: nativeTokens.color.lineHard,
          backgroundColor: disabled ? nativeTokens.color.surfaceSunken : nativeTokens.color.surface,
        }}
      >
        <Text
          style={{
            color: value ? nativeTokens.color.ink : nativeTokens.color.inkSubtle,
            fontFamily: nativeTokens.type.family.body,
            fontSize: nativeTokens.type.scale.body.size,
            textAlign: "right",
          }}
        >
          {value || t(allowEmpty ? "common.cityField.all" : "common.cityField.placeholder")}
        </Text>
      </Pressable>

      <Sheet open={open} onClose={() => setOpen(false)} title={t("common.cityField.label")}>
        <View style={{ gap: nativeTokens.space[3] }}>
          {allowEmpty ? (
            <Chip
              selected={value === ""}
              accessibilityLabel={t("common.cityField.all")}
              onPress={() => {
                setOther(false);
                onChange("");
                setOpen(false);
              }}
            >
              {t("common.cityField.all")}
            </Chip>
          ) : null}
          {PS_GOVERNORATES.map((gov) => (
            <View key={gov.key} style={{ gap: nativeTokens.space[1] }}>
              <Text
                style={{
                  color: nativeTokens.color.inkMuted,
                  fontFamily: nativeTokens.type.family.sans,
                  fontSize: nativeTokens.type.scale.small.size,
                  fontWeight: "600",
                  textAlign: "right",
                }}
              >
                {isArabic ? gov.ar : gov.en}
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: nativeTokens.space[2] }}>
                {gov.cities.map((city) => (
                  <Chip
                    key={city.key}
                    selected={value === city.ar}
                    accessibilityLabel={isArabic ? city.ar : city.en}
                    onPress={() => {
                      setOther(false);
                      onChange(city.ar);
                      setOpen(false);
                    }}
                  >
                    {isArabic ? city.ar : city.en}
                  </Chip>
                ))}
              </View>
            </View>
          ))}
          <Chip
            selected={other}
            accessibilityLabel={t("common.cityField.other")}
            onPress={() => setOther(true)}
          >
            {t("common.cityField.other")}
          </Chip>
          {other ? (
            <Input
              fullWidth
              size="lg"
              value={value}
              accessibilityLabel={t("common.cityField.otherLabel")}
              placeholder={t("common.cityField.otherPlaceholder")}
              onChangeText={(v) => onChange(normalizeCity(v))}
            />
          ) : null}
        </View>
      </Sheet>
    </View>
  );
}
