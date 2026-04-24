import { Sheet, nativeTokens } from "@palnet/ui-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Pressable, Text, View } from "react-native";

import { ReportDialog } from "@/components/ReportDialog";
import { apiCall } from "@/lib/api";
import { getAccessToken } from "@/lib/session";

export function UserActions({
  open,
  onClose,
  userId,
  userName,
  onBlocked,
}: {
  open: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  onBlocked?: () => void;
}): JSX.Element {
  const { t } = useTranslation();
  const [reportOpen, setReportOpen] = useState(false);

  function confirmBlock(): void {
    Alert.alert(
      t("moderation.blockConfirmTitle", { name: userName }),
      t("moderation.blockConfirmBody"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("moderation.blockCta"),
          style: "destructive",
          onPress: () => void blockUser(),
        },
      ],
    );
  }

  async function blockUser(): Promise<void> {
    const token = await getAccessToken();
    if (!token) return;
    try {
      await apiCall("/blocks", {
        method: "POST",
        token,
        body: { userId },
      });
      onClose();
      onBlocked?.();
    } catch {
      Alert.alert(t("moderation.blockErrorToast"));
    }
  }

  return (
    <>
      <Sheet
        open={open}
        onClose={onClose}
        title={t("moderation.more")}
        closeLabel={t("common.cancel")}
      >
        <View style={{ gap: nativeTokens.space[1] }} testID="user-actions">
          <ActionRow
            label={t("moderation.reportUser")}
            onPress={() => {
              onClose();
              setTimeout(() => setReportOpen(true), 50);
            }}
            testID="user-actions-report"
          />
          <ActionRow
            label={t("moderation.blockUser", { name: userName })}
            onPress={confirmBlock}
            danger
            testID="user-actions-block"
          />
        </View>
      </Sheet>
      <ReportDialog
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        targetKind="USER"
        targetId={userId}
      />
    </>
  );
}

function ActionRow({
  label,
  onPress,
  danger,
  testID,
}: {
  label: string;
  onPress: () => void;
  danger?: boolean;
  testID?: string;
}): JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => ({
        paddingVertical: nativeTokens.space[3],
        paddingHorizontal: nativeTokens.space[2],
        borderRadius: nativeTokens.radius.md,
        backgroundColor: pressed ? nativeTokens.color.surfaceSubtle : "transparent",
      })}
    >
      <Text
        style={{
          color: danger ? nativeTokens.color.danger : nativeTokens.color.ink,
          fontFamily: nativeTokens.type.family.sans,
          fontSize: nativeTokens.type.scale.body.size,
          fontWeight: "600",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
