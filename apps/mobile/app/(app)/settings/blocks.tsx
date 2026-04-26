// Blocked accounts — mobile twin of /settings/blocks on web. Lists people
// the viewer has blocked with an Unblock CTA that confirms via Alert.
// Filtering out blocked users on the feed/search/messaging side is done
// by the API, so this screen only needs to maintain the list.

import { BlockedUserList, type BlockedUserItem } from "@baydar/shared";
import { Avatar, Button, Surface, nativeTokens } from "@baydar/ui-native";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from "react-native";

import { apiCall, apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/session";

export default function BlocksScreen(): JSX.Element {
  const { t } = useTranslation();
  const [blocks, setBlocks] = useState<BlockedUserItem[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async (): Promise<void> => {
    const token = await getAccessToken();
    if (!token) {
      router.replace("/(auth)/login");
      return;
    }
    setError(false);
    try {
      const data = await apiFetch("/blocks", BlockedUserList, { token });
      setBlocks(data.blocks);
    } catch {
      setError(true);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  function confirmUnblock(item: BlockedUserItem): void {
    const name = `${item.firstName} ${item.lastName}`.trim() || item.handle;
    Alert.alert(
      t("settings.blocksInfo.unblockConfirmTitle", { name }),
      t("settings.blocksInfo.unblockConfirmBody"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("settings.blocksInfo.unblock"),
          style: "destructive",
          onPress: () => void unblock(item),
        },
      ],
    );
  }

  async function unblock(item: BlockedUserItem): Promise<void> {
    const token = await getAccessToken();
    if (!token) return;
    setBusyId(item.userId);
    setError(false);
    try {
      await apiCall(`/blocks/${item.userId}`, { method: "DELETE", token });
      await load();
    } catch {
      setError(true);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: nativeTokens.color.surfaceMuted }}
      testID="settings-blocks"
    >
      <ScrollView
        contentContainerStyle={{
          padding: nativeTokens.space[4],
          gap: nativeTokens.space[3],
        }}
      >
        <Surface variant="card" padding="4">
          <Text
            style={{
              color: nativeTokens.color.ink,
              fontFamily: nativeTokens.type.family.sans,
              fontSize: nativeTokens.type.scale.h3.size,
              fontWeight: "700",
              marginBottom: nativeTokens.space[1],
            }}
          >
            {t("settings.blocksInfo.title")}
          </Text>
          <Text
            style={{
              color: nativeTokens.color.inkMuted,
              fontFamily: nativeTokens.type.family.sans,
              fontSize: nativeTokens.type.scale.small.size,
            }}
          >
            {t("settings.blocksInfo.description")}
          </Text>
        </Surface>

        {blocks === null && !error ? (
          <View style={{ paddingVertical: nativeTokens.space[4] }}>
            <ActivityIndicator />
          </View>
        ) : null}

        {error ? (
          <Surface variant="tinted" padding="4">
            <Text
              accessibilityRole="alert"
              style={{
                color: nativeTokens.color.danger,
                fontFamily: nativeTokens.type.family.sans,
                fontSize: nativeTokens.type.scale.small.size,
              }}
            >
              {t("settings.blocksInfo.genericError")}
            </Text>
          </Surface>
        ) : null}

        {blocks && blocks.length === 0 ? (
          <Surface variant="tinted" padding="4">
            <Text
              style={{
                color: nativeTokens.color.inkMuted,
                fontFamily: nativeTokens.type.family.sans,
                fontSize: nativeTokens.type.scale.body.size,
              }}
            >
              {t("settings.blocksInfo.empty")}
            </Text>
          </Surface>
        ) : null}

        {blocks && blocks.length > 0 ? (
          <Surface variant="card" padding="2">
            {blocks.map((b, idx) => {
              const name = `${b.firstName} ${b.lastName}`.trim() || b.handle;
              return (
                <View
                  key={b.userId}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: nativeTokens.space[3],
                    paddingVertical: nativeTokens.space[3],
                    paddingHorizontal: nativeTokens.space[2],
                    borderTopWidth: idx === 0 ? 0 : 1,
                    borderTopColor: nativeTokens.color.lineSoft,
                  }}
                  testID={`blocks-row-${b.userId}`}
                >
                  <Pressable
                    onPress={() => router.push(`/(app)/in/${b.handle}` as never)}
                    style={{
                      flex: 1,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: nativeTokens.space[3],
                    }}
                    accessibilityRole="link"
                    accessibilityLabel={name}
                  >
                    <Avatar
                      user={{
                        handle: b.handle,
                        firstName: b.firstName,
                        lastName: b.lastName,
                        avatarUrl: b.avatarUrl,
                      }}
                      size="sm"
                    />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text
                        numberOfLines={1}
                        style={{
                          color: nativeTokens.color.ink,
                          fontFamily: nativeTokens.type.family.sans,
                          fontSize: nativeTokens.type.scale.body.size,
                          fontWeight: "600",
                        }}
                      >
                        {name}
                      </Text>
                      <Text
                        numberOfLines={1}
                        style={{
                          color: nativeTokens.color.inkMuted,
                          fontFamily: nativeTokens.type.family.sans,
                          fontSize: nativeTokens.type.scale.small.size,
                        }}
                      >
                        @{b.handle}
                      </Text>
                    </View>
                  </Pressable>
                  <Button
                    variant="secondary"
                    size="sm"
                    onPress={() => confirmUnblock(b)}
                    loading={busyId === b.userId}
                    testID={`blocks-unblock-${b.userId}`}
                  >
                    {t("settings.blocksInfo.unblock")}
                  </Button>
                </View>
              );
            })}
          </Surface>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
