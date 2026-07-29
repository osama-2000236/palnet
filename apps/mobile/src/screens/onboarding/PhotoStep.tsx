import { Alert, Button, Icon, nativeTokens, useThemeTokens } from "@baydar/ui-native";
import { Image } from "expo-image";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

import type { PickedAsset } from "@/lib/uploads";

export function PhotoStep({
  avatarAsset,
  onPick,
  onRemove,
  photoError,
}: {
  avatarAsset: PickedAsset | null;
  onPick: () => Promise<void>;
  onRemove: () => void;
  photoError: string | null;
}): JSX.Element {
  const c = useThemeTokens().color;
  const { t } = useTranslation();
  return (
    <View style={{ alignItems: "center", gap: nativeTokens.space[4] }}>
      <View
        style={{
          width: nativeTokens.space[24],
          height: nativeTokens.space[24],
          borderRadius: nativeTokens.radius.full,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: c.lineHard,
          backgroundColor: c.surfaceSubtle,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {avatarAsset ? (
          <Image
            source={{ uri: avatarAsset.uri }}
            contentFit="cover"
            style={{ width: "100%", height: "100%" }}
          />
        ) : (
          <Icon name="logo" size={nativeTokens.space[12]} color={c.brand600} />
        )}
      </View>
      <View style={{ alignSelf: "stretch", gap: nativeTokens.space[2] }}>
        <Button
          accessibilityLabel={t("onboarding.photo.choose")}
          fullWidth
          size="lg"
          variant="secondary"
          onPress={() => void onPick()}
        >
          {avatarAsset ? t("onboarding.photo.change") : t("onboarding.photo.choose")}
        </Button>
        {avatarAsset ? (
          <Button
            accessibilityLabel={t("onboarding.photo.remove")}
            fullWidth
            size="md"
            variant="ghost"
            onPress={onRemove}
          >
            {t("onboarding.photo.remove")}
          </Button>
        ) : null}
      </View>
      <Text
        selectable
        style={{
          color: c.inkMuted,
          fontFamily: nativeTokens.type.family.body,
          fontSize: nativeTokens.type.scale.small.size,
          lineHeight: nativeTokens.type.scale.small.line,
          textAlign: "center",
        }}
      >
        {t("onboarding.photo.hint")}
      </Text>
      {photoError ? <Alert body={photoError} kind="danger" /> : null}
    </View>
  );
}
