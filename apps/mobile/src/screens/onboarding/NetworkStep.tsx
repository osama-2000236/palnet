import {
  Alert,
  Avatar,
  Button,
  EmptyState,
  Icon,
  Surface,
  nativeTokens,
  useThemeTokens,
} from "@baydar/ui-native";
import { type Control, type FieldErrors } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { ControlledField } from "./Fields";
import type { PersonSuggestionDto } from "./api";
import type { OnboardingFormValues } from "./types";

export function NetworkStep({
  control,
  error,
  errors,
  loading,
  onRetry,
  onToggle,
  selectedIds,
  suggestions,
}: {
  control: Control<OnboardingFormValues>;
  error: string | null;
  errors: FieldErrors<OnboardingFormValues>;
  loading: boolean;
  onRetry: () => Promise<void>;
  onToggle: (userId: string) => void;
  selectedIds: Set<string>;
  suggestions: PersonSuggestionDto[];
}): JSX.Element {
  const c = useThemeTokens().color;
  const { t } = useTranslation();

  return (
    <View style={{ gap: nativeTokens.space[3] }}>
      <ControlledField
        control={control}
        error={errors.networkMessage?.message}
        hint={t("onboarding.network.messageHint")}
        label={t("onboarding.network.message")}
        multiline
        name="networkMessage"
        testID="onboarding-network-message"
      />
      {loading ? (
        <View style={{ paddingVertical: nativeTokens.space[6], alignItems: "center" }}>
          <ActivityIndicator color={c.brand600} />
          <Text
            selectable
            style={{
              marginTop: nativeTokens.space[2],
              color: c.inkMuted,
              fontFamily: nativeTokens.type.family.sans,
              fontSize: nativeTokens.type.scale.small.size,
            }}
          >
            {t("onboarding.network.loading")}
          </Text>
        </View>
      ) : error ? (
        <View style={{ gap: nativeTokens.space[2] }}>
          <Alert body={error} kind="warning" />
          <Button size="md" variant="secondary" onPress={() => void onRetry()}>
            {t("common.retry")}
          </Button>
        </View>
      ) : suggestions.length === 0 ? (
        <EmptyState
          motif="network"
          variant="inline"
          title={t("onboarding.network.emptyTitle")}
          body={t("onboarding.network.emptyBody")}
        />
      ) : (
        <View style={{ gap: nativeTokens.space[2] }}>
          {suggestions.map((suggestion) => (
            <SuggestionRow
              key={suggestion.user.userId}
              selected={selectedIds.has(suggestion.user.userId)}
              suggestion={suggestion}
              onPress={() => onToggle(suggestion.user.userId)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

function SuggestionRow({
  onPress,
  selected,
  suggestion,
}: {
  onPress: () => void;
  selected: boolean;
  suggestion: PersonSuggestionDto;
}): JSX.Element {
  const c = useThemeTokens().color;
  const { t } = useTranslation();
  const name = `${suggestion.user.firstName} ${suggestion.user.lastName}`.trim();

  return (
    <Pressable
      accessibilityLabel={name}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      testID={`onboarding-suggestion-${suggestion.user.userId}`}
      style={({ pressed }) => ({ opacity: pressed ? 0.86 : 1 })}
      onPress={onPress}
    >
      <Surface
        padding="3"
        variant={selected ? "tinted" : "flat"}
        style={{ flexDirection: "row", alignItems: "center", gap: nativeTokens.space[3] }}
      >
        <Avatar
          size="md"
          user={{
            id: suggestion.user.userId,
            handle: suggestion.user.handle,
            firstName: suggestion.user.firstName,
            lastName: suggestion.user.lastName,
            avatarUrl: suggestion.user.avatarUrl,
          }}
        />
        <View style={{ flex: 1 }}>
          <Text
            selectable
            style={{
              color: c.ink,
              fontFamily: nativeTokens.type.family.sans,
              fontSize: nativeTokens.type.scale.h3.size,
              fontWeight: "700",
              lineHeight: nativeTokens.type.scale.h3.line,
              textAlign: "auto",
            }}
          >
            {name || suggestion.user.handle}
          </Text>
          {suggestion.user.headline ? (
            <Text
              numberOfLines={2}
              selectable
              style={{
                color: c.inkMuted,
                fontFamily: nativeTokens.type.family.sans,
                fontSize: nativeTokens.type.scale.small.size,
                lineHeight: nativeTokens.type.scale.small.line,
                textAlign: "auto",
              }}
            >
              {suggestion.user.headline}
            </Text>
          ) : null}
        </View>
        <View
          style={{
            width: nativeTokens.space[5],
            height: nativeTokens.space[5],
            borderRadius: nativeTokens.radius.sm,
            borderWidth: 1,
            borderColor: selected ? c.brand600 : c.lineHard,
            backgroundColor: selected ? c.brand600 : c.surface,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {selected ? (
            <Icon name="check" size={nativeTokens.space[4]} color={c.inkInverse} />
          ) : null}
        </View>
        <Text
          selectable
          style={{
            minWidth: nativeTokens.space[16],
            color: selected ? c.brand700 : c.inkMuted,
            fontFamily: nativeTokens.type.family.sans,
            fontSize: nativeTokens.type.scale.caption.size,
            fontWeight: "700",
            textAlign: "center",
          }}
        >
          {selected ? t("onboarding.network.selected") : t("onboarding.network.select")}
        </Text>
      </Surface>
    </Pressable>
  );
}
