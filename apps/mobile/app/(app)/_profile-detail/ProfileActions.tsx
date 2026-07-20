import type { Profile } from "@baydar/shared";
import { BlockButton, Button, type BlockButtonLabels } from "@baydar/ui-native";
import { useTranslation } from "react-i18next";
import { View } from "react-native";

import { useProfileStyles } from "./styles";

export type ConnectionAction = "CONNECT" | "WITHDRAW" | "ACCEPT" | "DECLINE" | "REMOVE";

export function ProfileActions({
  blockLabels,
  blockLoading,
  busy,
  isBlocked,
  profile,
  onBlockChange,
  onConnectionAction,
  onMessage,
  onReport,
}: {
  blockLabels: BlockButtonLabels;
  blockLoading: boolean;
  busy: boolean;
  isBlocked: boolean;
  profile: Profile;
  onBlockChange: (nextBlocked: boolean, userId: string) => void;
  onConnectionAction: (action: ConnectionAction) => void;
  onMessage: () => void;
  onReport: () => void;
}): JSX.Element | null {
  const profileStyles = useProfileStyles();
  const { t } = useTranslation();
  const conn = profile.viewer?.connection;

  if (!profile.viewer || profile.viewer.isSelf) {
    return null;
  }

  return (
    <View style={profileStyles.actionsRow}>
      {!conn || conn.status === "WITHDRAWN" || conn.status === "DECLINED" ? (
        <Button
          variant="primary"
          size="md"
          disabled={busy}
          onPress={() => onConnectionAction("CONNECT")}
        >
          {t("network.connect")}
        </Button>
      ) : conn.status === "PENDING" && conn.direction === "OUTGOING" ? (
        <Button
          variant="secondary"
          size="md"
          disabled={busy}
          onPress={() => onConnectionAction("WITHDRAW")}
        >
          {t("network.withdraw")}
        </Button>
      ) : conn.status === "PENDING" && conn.direction === "INCOMING" ? (
        <>
          <Button
            variant="primary"
            size="md"
            disabled={busy}
            onPress={() => onConnectionAction("ACCEPT")}
          >
            {t("network.accept")}
          </Button>
          <Button
            variant="secondary"
            size="md"
            disabled={busy}
            onPress={() => onConnectionAction("DECLINE")}
          >
            {t("network.decline")}
          </Button>
        </>
      ) : conn.status === "ACCEPTED" ? (
        <Button
          variant="secondary"
          size="md"
          disabled={busy}
          onPress={() => onConnectionAction("REMOVE")}
        >
          {t("network.removeConnection")}
        </Button>
      ) : null}
      <Button variant="secondary" size="md" disabled={busy} onPress={onMessage}>
        {t("messaging.newMessage")}
      </Button>
      <Button variant="secondary" size="md" onPress={onReport}>
        {t("safety.report.action")}
      </Button>
      <BlockButton
        userId={profile.userId}
        isBlocked={isBlocked}
        variant={isBlocked ? "unblock" : "block"}
        labels={blockLabels}
        loading={blockLoading}
        onChange={onBlockChange}
      />
    </View>
  );
}
