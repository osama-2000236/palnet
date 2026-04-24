// PostActions — bottom-sheet action menu for a post. Mirrors the web
// MoreMenu wired into PostCard: offers Report + Block for the post's
// author. Host owns the post reference and the "hide after block"
// callback; this component owns only presentation and the two network
// side effects.

import type { ReportTargetKind } from "@palnet/shared";
import { Sheet, nativeTokens } from "@palnet/ui-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Pressable, Text, View } from "react-native";

import { ReportDialog } from "@/components/ReportDialog";
import { apiCall } from "@/lib/api";
import { getAccessToken } from "@/lib/session";

export function PostActions({
  open,
  onClose,
  authorId,
  authorName,
  targetKind,
  targetId,
  onHide,
}: {
  open: boolean;
  onClose: () => void;
  authorId: string;
  authorName: string;
  targetKind: ReportTargetKind;
  targetId: string;
  /** Fired after a successful block so the host can drop the row. */
  onHide?: () => void;
}): JSX.Element {
  const { t } = useTranslation();
  const [reportOpen, setReportOpen] = useState(false);

  function confirmBlock(): void {
    Alert.alert(
      t("moderation.blockConfirmTitle", { name: authorName }),
      t("moderation.blockConfirmBody"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("moderation.blockCta"),
          style: "destructive",
          onPress: () => void doBlock(),
        },
      ],
    );
  }

  async function doBlock(): Promise<void> {
    const token = await getAccessToken();
    if (!token) return;
    try {
      await apiCall("/blocks", {
        method: "POST",
        token,
        body: { userId: authorId },
      });
      onClose();
      onHide?.();
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
        <View style={{ gap: nativeTokens.space[1] }} testID="post-actions">
          <ActionRow
            label={t("moderation.reportPost")}
            onPress={() => {
              onClose();
              // Tick after close so the sheet unmount doesn't swallow the
              // next sheet's open transition on iOS.
              setTimeout(() => setReportOpen(true), 50);
            }}
            testID="post-actions-report"
          />
          <ActionRow
            label={t("moderation.blockUser", { name: authorName })}
            onPress={confirmBlock}
            danger
            testID="post-actions-block"
          />
        </View>
      </Sheet>
      <ReportDialog
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        targetKind={targetKind}
        targetId={targetId}
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
