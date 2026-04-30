import {
  ChatRoom as ChatRoomSchema,
  ConnectionListItem,
  type ConnectionListItem as ConnectionListItemType,
} from "@baydar/shared";
import { AppHeader, Avatar, Button, Icon, SearchField, Surface, nativeTokens } from "@baydar/ui-native";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { z } from "zod";

import { apiFetch, apiFetchPage } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-errors";
import { successHaptic, tapHaptic } from "@/lib/haptics";
import { getAccessToken } from "@/lib/session";

const ConnectionsEnvelope = z.object({ data: z.array(ConnectionListItem) });

export default function NewGroupRoomScreen(): JSX.Element {
  const { t } = useTranslation();
  const [token, setToken] = useState<string | null>(null);
  const [connections, setConnections] = useState<ConnectionListItemType[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [query, setQuery] = useState("");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        router.replace("/(auth)/login");
        return;
      }
      setToken(accessToken);
      try {
        const out = await apiFetchPage("/connections?filter=ACCEPTED", ConnectionsEnvelope, {
          token: accessToken,
        });
        setConnections(out.data);
      } catch (caught) {
        setError(apiErrorMessage(t, caught));
      } finally {
        setLoading(false);
      }
    })();
  }, [t]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    if (!needle) return connections;
    return connections.filter((item) => {
      const haystack = [
        item.user.firstName,
        item.user.lastName,
        item.user.handle,
        item.user.headline,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase();
      return haystack.includes(needle);
    });
  }, [connections, query]);

  const toggle = useCallback((userId: string): void => {
    tapHaptic();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }, []);

  const submit = useCallback(async (): Promise<void> => {
    if (!token) return;
    setError(null);
    if (selectedIds.size < 2 || title.trim().length === 0) {
      setError(t("messaging.newGroup.validation"));
      return;
    }
    setSubmitting(true);
    try {
      const room = await apiFetch("/messaging/rooms", ChatRoomSchema, {
        method: "POST",
        token,
        body: {
          isGroup: true,
          memberIds: Array.from(selectedIds),
          title: title.trim(),
        },
      });
      successHaptic();
      router.replace({ pathname: "/(app)/messages/[roomId]", params: { roomId: room.id } });
    } catch (caught) {
      setError(apiErrorMessage(t, caught));
    } finally {
      setSubmitting(false);
    }
  }, [selectedIds, title, token, t]);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.wrap}>
        <AppHeader
          title={t("messaging.newGroup.title")}
          subtitle={t("messaging.newGroup.subtitle")}
          compact
          trailing={
            <Button variant="ghost" size="sm" onPress={() => router.back()}>
              {t("common.back")}
            </Button>
          }
        />

        <Surface variant="card" padding="4">
          <Text style={styles.label}>{t("messaging.newGroup.roomTitle")}</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder={t("messaging.newGroup.roomTitlePlaceholder")}
            placeholderTextColor={nativeTokens.color.inkMuted}
            style={styles.input}
          />
          <Text style={[styles.label, styles.spaced]}>{t("messaging.newGroup.search")}</Text>
          <SearchField
            value={query}
            onChangeText={setQuery}
            onClear={() => setQuery("")}
            clearLabel={t("common.clear")}
            placeholder={t("messaging.newGroup.searchPlaceholder")}
            accessibilityLabel={t("messaging.newGroup.search")}
          />
        </Surface>

        {error ? (
          <Surface variant="tinted" padding="3" accessibilityRole="alert">
            <Text style={styles.error}>{error}</Text>
          </Surface>
        ) : null}

        <FlatList
          data={filtered}
          keyExtractor={(item) => item.user.userId}
          ListEmptyComponent={
            loading ? (
              <ActivityIndicator />
            ) : (
              <Surface variant="tinted" padding="4">
                <Text style={styles.empty}>{t("messaging.newGroup.empty")}</Text>
              </Surface>
            )
          }
          renderItem={({ item }) => {
            const selected = selectedIds.has(item.user.userId);
            const name = `${item.user.firstName} ${item.user.lastName}`.trim() || item.user.handle;
            return (
              <Pressable
                onPress={() => toggle(item.user.userId)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected }}
                accessibilityLabel={name}
              >
                <Surface variant={selected ? "tinted" : "card"} padding="3">
                  <View style={styles.row}>
                    <Avatar
                      size="md"
                      user={{
                        id: item.user.userId,
                        handle: item.user.handle,
                        firstName: item.user.firstName,
                        lastName: item.user.lastName,
                        avatarUrl: item.user.avatarUrl ?? null,
                      }}
                    />
                    <View style={styles.personText}>
                      <Text style={styles.name}>{name}</Text>
                      {item.user.headline ? (
                        <Text numberOfLines={1} style={styles.headline}>
                          {item.user.headline}
                        </Text>
                      ) : null}
                    </View>
                    <View style={[styles.chip, selected ? styles.chipOn : null]}>
                      <Text style={[styles.chipText, selected ? styles.chipTextOn : null]}>
                        {selected
                          ? t("messaging.newGroup.selected")
                          : t("messaging.newGroup.select")}
                      </Text>
                    </View>
                  </View>
                </Surface>
              </Pressable>
            );
          }}
          ItemSeparatorComponent={() => <View style={{ height: nativeTokens.space[2] }} />}
          contentContainerStyle={styles.list}
        />

        <Button
          variant="primary"
          size="lg"
          disabled={submitting || selectedIds.size < 2 || title.trim().length === 0}
          onPress={() => void submit()}
          accessibilityLabel={t("messaging.newGroup.submit")}
          loading={submitting}
          leading={<Icon name="send" size={18} color={nativeTokens.color.inkInverse} />}
        >
          {t("messaging.newGroup.submit")}
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: nativeTokens.color.surfaceMuted,
  },
  wrap: {
    flex: 1,
    gap: nativeTokens.space[3],
    paddingHorizontal: nativeTokens.space[4],
    paddingTop: nativeTokens.space[6],
    paddingBottom: nativeTokens.space[4],
  },
  label: {
    color: nativeTokens.color.ink,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.small.size,
    fontWeight: "700",
  },
  spaced: {
    marginTop: nativeTokens.space[3],
  },
  input: {
    marginTop: nativeTokens.space[1],
    minHeight: 44,
    borderWidth: 1,
    borderColor: nativeTokens.color.lineHard,
    borderRadius: nativeTokens.radius.md,
    paddingHorizontal: nativeTokens.space[3],
    color: nativeTokens.color.ink,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.body.size,
  },
  error: {
    color: nativeTokens.color.danger,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.small.size,
  },
  empty: {
    textAlign: "center",
    color: nativeTokens.color.inkMuted,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.body.size,
  },
  list: {
    paddingBottom: nativeTokens.space[3],
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: nativeTokens.space[3],
  },
  personText: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    color: nativeTokens.color.ink,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.h3.size,
    fontWeight: "700",
  },
  headline: {
    color: nativeTokens.color.inkMuted,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.small.size,
  },
  chip: {
    borderWidth: 1,
    borderColor: nativeTokens.color.lineHard,
    borderRadius: nativeTokens.radius.full,
    paddingHorizontal: nativeTokens.space[2],
    paddingVertical: nativeTokens.space[1],
  },
  chipOn: {
    borderColor: nativeTokens.color.brand600,
    backgroundColor: nativeTokens.color.brand100,
  },
  chipText: {
    color: nativeTokens.color.inkMuted,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.caption.size,
    fontWeight: "700",
  },
  chipTextOn: {
    color: nativeTokens.color.brand700,
  },
});
