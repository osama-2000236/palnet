import { BlockedListItem, Button, Surface, nativeTokens, useToast } from "@baydar/ui-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useBlockedUsers, useUnblock } from "@/api/safety";
import { EmptyState, LowWall } from "@baydar/ui-native";

import { StateMessage } from "@/components/StateMessage";

export default function BlockedUsersScreen(): JSX.Element {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [cursor, setCursor] = useState<string | null>(null);
  const blocked = useBlockedUsers(cursor);
  const unblock = useUnblock();
  const items = blocked.data?.data ?? [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: nativeTokens.color.surfaceMuted }}>
      <View style={{ flex: 1, padding: nativeTokens.space[4], gap: nativeTokens.space[3] }}>
        <Text
          accessibilityRole="header"
          style={{
            color: nativeTokens.color.ink,
            fontFamily: nativeTokens.type.family.sans,
            fontSize: nativeTokens.type.scale.h1.size,
            lineHeight: nativeTokens.type.scale.h1.line,
            fontWeight: "700",
            textAlign: "auto",
          }}
        >
          {t("safety.blocked.title")}
        </Text>
        <Surface variant="flat" padding="4" style={{ flex: 1 }}>
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <BlockedListItem
                item={item}
                labels={{ unblock: t("safety.blocked.unblock") }}
                loading={unblock.isPending}
                onUnblock={(blockedUserId) =>
                  unblock.mutate(blockedUserId, {
                    onSuccess: () =>
                      showToast({ message: t("safety.unblock.success"), kind: "success" }),
                    onError: () => showToast({ message: t("safety.unblock.error"), kind: "error" }),
                  })
                }
              />
            )}
            ListEmptyComponent={
              blocked.isLoading ? (
                <StateMessage message={t("common.loading")} role="text" />
              ) : (
                <EmptyState
                  illustration={<LowWall size={128} />}
                  title={t("safety.blocked.empty")}
                  description={t("safety.blocked.emptyDesc")}
                  density="compact"
                />
              )
            }
            ListFooterComponent={
              blocked.data?.meta.hasMore ? (
                <Button
                  variant="secondary"
                  onPress={() => setCursor(blocked.data?.meta.nextCursor ?? null)}
                  accessibilityLabel={t("safety.blocked.loadMore")}
                >
                  {t("safety.blocked.loadMore")}
                </Button>
              ) : null
            }
          />
        </Surface>
      </View>
    </SafeAreaView>
  );
}
