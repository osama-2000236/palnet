import { Button, Surface, nativeTokens } from "@baydar/ui-native";
import { useTranslation } from "react-i18next";
import { I18nManager, Text, View } from "react-native";

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
  const { t } = useTranslation();

  return (
    <View style={{ gap: nativeTokens.space[2] }}>
      <Text
        selectable
        style={{
          color: nativeTokens.color.brand600,
          fontFamily: nativeTokens.type.family.sans,
          fontSize: nativeTokens.type.scale.caption.size,
          fontWeight: "700",
          lineHeight: nativeTokens.type.scale.caption.line,
          textAlign: I18nManager.isRTL ? "right" : "left",
        }}
      >
        {t("onboarding.progress", { current: active + 1, total: count })}
      </Text>
      <Text
        selectable
        style={{
          color: nativeTokens.color.ink,
          fontFamily: nativeTokens.type.family.sans,
          fontSize: nativeTokens.type.scale.display.size,
          fontWeight: "700",
          lineHeight: nativeTokens.type.scale.display.line,
          textAlign: I18nManager.isRTL ? "right" : "left",
        }}
      >
        {label}
      </Text>
      <Text
        selectable
        style={{
          color: nativeTokens.color.inkMuted,
          fontFamily: nativeTokens.type.family.body,
          fontSize: nativeTokens.type.scale.body.size,
          lineHeight: nativeTokens.type.scale.body.line,
          textAlign: I18nManager.isRTL ? "right" : "left",
        }}
      >
        {t(`onboarding.stepCopy.${step}`)}
      </Text>
    </View>
  );
}

export function StepDots({ active, count }: { active: number; count: number }): JSX.Element {
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
            backgroundColor:
              index === active ? nativeTokens.color.brand600 : nativeTokens.color.surfaceSunken,
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
  return (
    <Surface
      accessibilityRole={tone === "danger" ? "alert" : "text"}
      padding="3"
      variant="tinted"
      style={{
        backgroundColor:
          tone === "danger" ? nativeTokens.color.dangerSoft : nativeTokens.color.warningSoft,
      }}
    >
      <Text
        selectable
        style={{
          color: tone === "danger" ? nativeTokens.color.danger : nativeTokens.color.ink,
          fontFamily: nativeTokens.type.family.sans,
          fontSize: nativeTokens.type.scale.small.size,
          lineHeight: nativeTokens.type.scale.small.line,
          textAlign: "right",
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
        borderTopColor: nativeTokens.color.lineSoft,
        backgroundColor: nativeTokens.color.surfaceMuted,
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

export default () => null;
