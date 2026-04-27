import {
  ConnectionListItem as ConnectionListItemSchema,
  type ConnectionListItem,
} from "@baydar/shared";
import { Avatar, Button, Surface, nativeTokens } from "@baydar/ui-native";
import { router } from "expo-router";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { z } from "zod";

import { apiFetch } from "@/lib/api";
import { successHaptic, tapHaptic } from "@/lib/haptics";
import { getAccessToken, readSession } from "@/lib/session";

const ListEnvelope = z.array(ConnectionListItemSchema);
const Raw = z.object({}).passthrough();
type Filter = "ACCEPTED" | "INCOMING" | "OUTGOING";

export default function NetworkScreen(): JSX.Element {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<Filter>("ACCEPTED");
  const [items, setItems] = useState<ConnectionListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (f: Filter): Promise<void> => {
    const token = await getAccessToken();
    if (!token) return;
    setLoading(true);
    try {
      const data = await apiFetch(`/connections?filter=${f}`, ListEnvelope, {
        token,
      });
      setItems(data);
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async (): Promise<void> => {
    setRefreshing(true);
    try {
      await load(filter);
    } finally {
      setRefreshing(false);
    }
  }, [filter, load]);

  useEffect(() => {
    void (async () => {
      const session = await readSession();
      if (!session) {
        router.replace("/(auth)/login");
        return;
      }
      await load(filter);
    })();
  }, [filter, load]);

  async function respond(id: string, action: "ACCEPT" | "DECLINE"): Promise<void> {
    const token = await getAccessToken();
    if (!token) return;
    tapHaptic();
    await apiFetch(`/connections/${id}/respond`, Raw, {
      method: "POST",
      token,
      body: { action },
    });
    successHaptic();
    setItems((prev) => prev.filter((x) => x.connectionId !== id));
  }

  async function withdraw(id: string): Promise<void> {
    const token = await getAccessToken();
    if (!token) return;
    tapHaptic();
    await apiFetch(`/connections/${id}/withdraw`, Raw, {
      method: "POST",
      token,
    });
    successHaptic();
    setItems((prev) => prev.filter((x) => x.connectionId !== id));
  }

  async function remove(id: string): Promise<void> {
    const token = await getAccessToken();
    if (!token) return;
    tapHaptic();
    await apiFetch(`/connections/${id}`, Raw, {
      method: "DELETE",
      token,
    });
    successHaptic();
    setItems((prev) => prev.filter((x) => x.connectionId !== id));
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <Text style={styles.title}>{t("network.title")}</Text>

        <View style={styles.tabs}>
          <FilterTab active={filter === "ACCEPTED"} onPress={() => setFilter("ACCEPTED")}>
            {t("network.myConnections")}
          </FilterTab>
          <FilterTab active={filter === "INCOMING"} onPress={() => setFilter("INCOMING")}>
            {t("network.invitations")}
          </FilterTab>
          <FilterTab active={filter === "OUTGOING"} onPress={() => setFilter("OUTGOING")}>
            {t("network.sent")}
          </FilterTab>
        </View>

        <FlatList
          data={items}
          keyExtractor={(c) => c.connectionId}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void refresh()}
              tintColor={nativeTokens.color.brand600}
              colors={[nativeTokens.color.brand600]}
            />
          }
          ListEmptyComponent={
            loading ? (
              <View style={styles.loading}>
                <ActivityIndicator />
              </View>
            ) : (
              <Surface variant="tinted" padding="6">
                <Text style={styles.emptyText}>{t("network.empty")}</Text>
              </Surface>
            )
          }
          renderItem={({ item }) => (
            <ConnectionRow
              item={item}
              filter={filter}
              onRespond={respond}
              onWithdraw={withdraw}
              onRemove={remove}
            />
          )}
        />
      </View>
    </SafeAreaView>
  );
}

function ConnectionRow({
  item,
  filter,
  onRespond,
  onWithdraw,
  onRemove,
}: {
  item: ConnectionListItem;
  filter: Filter;
  onRespond: (id: string, action: "ACCEPT" | "DECLINE") => Promise<void>;
  onWithdraw: (id: string) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}): JSX.Element {
  const { t } = useTranslation();
  const name = `${item.user.firstName} ${item.user.lastName}`.trim();

  return (
    <Surface variant="card" padding="4" style={styles.row}>
      <Pressable
        onPress={() => router.push(`/(app)/in/${item.user.handle}`)}
        style={styles.personLink}
        accessibilityRole="link"
        accessibilityLabel={name}
      >
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
        <View style={styles.personText}>
          <Text style={styles.name}>{name}</Text>
          {item.user.headline ? (
            <Text style={styles.headline} numberOfLines={2}>
              {item.user.headline}
            </Text>
          ) : null}
        </View>
      </Pressable>

      {filter === "INCOMING" ? (
        <View style={styles.actions}>
          <Button
            size="sm"
            onPress={() => void onRespond(item.connectionId, "ACCEPT")}
            accessibilityLabel={t("network.accept")}
          >
            {t("network.accept")}
          </Button>
          <Button
            variant="secondary"
            size="sm"
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
          onPress={() => void onWithdraw(item.connectionId)}
          accessibilityLabel={t("network.withdraw")}
        >
          {t("network.withdraw")}
        </Button>
      ) : (
        <Button
          variant="secondary"
          size="sm"
          onPress={() => void onRemove(item.connectionId)}
          accessibilityLabel={t("network.removeConnection")}
        >
          {t("network.removeConnection")}
        </Button>
      )}
    </Surface>
  );
}

function FilterTab({
  active,
  onPress,
  children,
}: {
  active: boolean;
  onPress: () => void;
  children: ReactNode;
}): JSX.Element {
  return (
    <Button
      variant={active ? "primary" : "secondary"}
      size="sm"
      onPress={onPress}
      accessibilityState={{ selected: active }}
    >
      {children}
    </Button>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: nativeTokens.color.surfaceMuted,
  },
  content: {
    flex: 1,
    paddingHorizontal: nativeTokens.space[4],
    paddingTop: nativeTokens.space[8],
  },
  title: {
    color: nativeTokens.color.ink,
    fontSize: nativeTokens.type.scale.display.size,
    lineHeight: nativeTokens.type.scale.display.line,
    fontWeight: "700",
    fontFamily: nativeTokens.type.family.sans,
    marginBottom: nativeTokens.space[3],
  },
  tabs: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: nativeTokens.space[2],
    marginBottom: nativeTokens.space[3],
  },
  listContent: {
    paddingBottom: nativeTokens.space[6],
  },
  separator: {
    height: nativeTokens.space[2],
  },
  loading: {
    paddingVertical: nativeTokens.space[6],
  },
  emptyText: {
    color: nativeTokens.color.inkMuted,
    fontSize: nativeTokens.type.scale.body.size,
    lineHeight: nativeTokens.type.scale.body.line,
    fontFamily: nativeTokens.type.family.sans,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: nativeTokens.space[3],
  },
  personLink: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: nativeTokens.space[3],
  },
  personText: {
    flex: 1,
  },
  name: {
    color: nativeTokens.color.ink,
    fontSize: nativeTokens.type.scale.h3.size,
    lineHeight: nativeTokens.type.scale.h3.line,
    fontWeight: "600",
    fontFamily: nativeTokens.type.family.sans,
  },
  headline: {
    color: nativeTokens.color.inkMuted,
    fontSize: nativeTokens.type.scale.small.size,
    lineHeight: nativeTokens.type.scale.small.line,
    fontFamily: nativeTokens.type.family.sans,
  },
  actions: {
    flexDirection: "row",
    gap: nativeTokens.space[2],
  },
});
