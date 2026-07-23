import type { ConnectionListItem } from "@baydar/shared";
import { Avatar, Button, RecordCard } from "@baydar/ui-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { View } from "react-native";

import { useStyles } from "./styles";

export type NetworkFilter = "ACCEPTED" | "INCOMING" | "OUTGOING";

export function ConnectionRow({
  filter,
  item,
  onRemove,
  onRespond,
  onWithdraw,
  pending,
}: {
  filter: NetworkFilter;
  item: ConnectionListItem;
  onRemove: (id: string) => Promise<void>;
  onRespond: (id: string, action: "ACCEPT" | "DECLINE") => Promise<void>;
  onWithdraw: (id: string) => Promise<void>;
  pending: boolean;
}): JSX.Element {
  const styles = useStyles();
  const { t } = useTranslation();
  const name = `${item.user.firstName} ${item.user.lastName}`.trim();

  return (
    <RecordCard
      variant="row"
      leading={
        <Avatar
          user={{
            id: item.user.userId,
            handle: item.user.handle,
            firstName: item.user.firstName,
            lastName: item.user.lastName,
            avatarUrl: item.user.avatarUrl,
          }}
          size="md"
        />
      }
      title={name}
      subtitle={item.user.headline}
      onPress={() => router.push(`/(app)/in/${item.user.handle}`)}
      accessibilityLabel={name}
      trailing={
        filter === "INCOMING" ? (
          <View style={styles.actions}>
            <Button
              size="sm"
              loading={pending}
              disabled={pending}
              onPress={() => void onRespond(item.connectionId, "ACCEPT")}
              accessibilityLabel={t("network.accept")}
            >
              {t("network.accept")}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={pending}
              onPress={() => void onRespond(item.connectionId, "DECLINE")}
              accessibilityLabel={t("network.decline")}
            >
              {t("network.decline")}
            </Button>
          </View>
        ) : filter === "OUTGOING" ? (
          <Button
            variant="secondary"
            size="sm"
            loading={pending}
            disabled={pending}
            onPress={() => void onWithdraw(item.connectionId)}
            accessibilityLabel={t("network.withdraw")}
          >
            {t("network.withdraw")}
          </Button>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            loading={pending}
            disabled={pending}
            onPress={() => void onRemove(item.connectionId)}
            accessibilityLabel={t("network.removeConnection")}
          >
            {t("network.removeConnection")}
          </Button>
        )
      }
    />
  );
}

// expo-router colocation: not a screen.
export default (): null => null;
