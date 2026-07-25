import { Button, Surface, nativeTokens, useThemeTokens } from "@baydar/ui-native";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

import type { StepKey } from "./types";

export function OnboardingHeader({
  active,
  count,
  label,
  step,
}: {
  active: number;
  count: number;
  label: string;
  step: StepKey;
}): JSX.Element {
  const c = useThemeTokens().color;
  const { t } = useTranslation();

  return (
    <View style={{ gap: nativeTokens.space[2] }}>
      <Text
        selectable
        style={{
          color: c.brand600,
          fontFamily: nativeTokens.type.family.sans,
          fontSize: nativeTokens.type.scale.caption.size,
          fontWeight: "700",
          lineHeight: nativeTokens.type.scale.caption.line,
          textAlign: "auto",
        }}
      >
        {t("onboarding.progress", { current: active + 1, total: count })}
      </Text>
      <Text
        selectable
        style={{
          color: c.ink,
          fontFamily: nativeTokens.type.family.sans,
          fontSize: nativeTokens.type.scale.display.size,
          fontWeight: "700",
          lineHeight: nativeTokens.type.scale.display.line,
          textAlign: "auto",
        }}
      >
        {label}
      </Text>
      <Text
        selectable
        style={{
          color: c.inkMuted,
          fontFamily: nativeTokens.type.family.body,
          fontSize: nativeTokens.type.scale.body.size,
          lineHeight: nativeTokens.type.scale.body.line,
          textAlign: "auto",
        }}
      >
        {t(`onboarding.stepCopy.${step}`)}
      </Text>
    </View>
  );
}

export function StepDots({ active, count }: { active: number; count: number }): JSX.Element {
  const c = useThemeTokens().color;
  return (
    <View
      accessibilityElementsHidden
      style={{ flexDirection: "row", justifyContent: "center", gap: nativeTokens.space[1] }}
    >
      {Array.from({ length: count }).map((_, index) => (
        <View
          key={index}
          style={{
            width: index === active ? nativeTokens.space[6] : nativeTokens.space[2],
            height: nativeTokens.space[2],
            borderRadius: nativeTokens.radius.full,
            backgroundColor: index === active ? c.brand600 : c.surfaceSunken,
          }}
        />
      ))}
    </View>
  );
}

export function StateMessage({
  message,
  tone,
}: {
  message: string;
  tone: "danger" | "warning";
}): JSX.Element {
  const c = useThemeTokens().color;
  return (
    <Surface
      accessibilityRole={tone === "danger" ? "alert" : "text"}
      padding="3"
      variant="tinted"
      style={{
        backgroundColor: tone === "danger" ? c.dangerSoft : c.warningSoft,
      }}
    >
      <Text
        selectable
        style={{
          color: tone === "danger" ? c.danger : c.ink,
          fontFamily: nativeTokens.type.family.sans,
          fontSize: nativeTokens.type.scale.small.size,
          lineHeight: nativeTokens.type.scale.small.line,
          textAlign: "auto",
        }}
      >
        {message}
      </Text>
    </Surface>
  );
}

export function OnboardingFooter({
  bottomInset,
  isConnected,
  isLastStep,
  onBack,
  onPrimaryPress,
  showBack,
  submitting,
}: {
  bottomInset: number;
  isConnected: boolean;
  isLastStep: boolean;
  onBack: () => void;
  onPrimaryPress: () => void;
  showBack: boolean;
  submitting: boolean;
}): JSX.Element {
  const c = useThemeTokens().color;
  const { t } = useTranslation();

  return (
    <View
      style={{
        flexDirection: "row",
        gap: nativeTokens.space[2],
        paddingHorizontal: nativeTokens.space[4],
        paddingTop: nativeTokens.space[3],
        paddingBottom: Math.max(bottomInset, nativeTokens.space[4]),
        borderTopWidth: 1,
        borderTopColor: c.lineSoft,
        backgroundColor: c.surfaceMuted,
        position: "absolute",
        start: 0,
        end: 0,
        bottom: 0,
        zIndex: 20,
        elevation: 20,
      }}
    >
      {showBack ? (
        <Button
          accessibilityLabel={t("onboarding.back")}
          disabled={submitting}
          size="lg"
          style={{ flex: 1 }}
          variant="secondary"
          onPress={onBack}
        >
          {t("onboarding.back")}
        </Button>
      ) : null}
      <Button
        accessibilityLabel={isLastStep ? t("onboarding.submit") : t("common.continue")}
        disabled={submitting || (isLastStep && !isConnected)}
        loading={submitting}
        size="lg"
        style={{ flex: 1 }}
        testID={isLastStep ? "onboarding-submit" : "onboarding-next"}
        onPress={onPrimaryPress}
      >
        {isLastStep ? t("onboarding.submit") : t("common.continue")}
      </Button>
    </View>
  );
}
