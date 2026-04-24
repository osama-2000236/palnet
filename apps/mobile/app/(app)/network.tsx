import {
  ConnectionListItem as ConnectionListItemSchema,
  type ConnectionListItem,
} from "@palnet/shared";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, FlatList, Pressable, SafeAreaView, Text, View } from "react-native";
import { z } from "zod";

import { apiFetch } from "@/lib/api";
import { getAccessToken, readSession } from "@/lib/session";

const ListEnvelope = z.array(ConnectionListItemSchema);
const Raw = z.object({}).passthrough();
type Filter = "ACCEPTED" | "INCOMING" | "OUTGOING";

export default function NetworkScreen(): JSX.Element {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<Filter>("ACCEPTED");
  const [items, setItems] = useState<ConnectionListItem[]>([]);
  const [loading, setLoading] = useState(false);

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
    await apiFetch(`/connections/${id}/respond`, Raw, {
      method: "POST",
      token,
      body: { action },
    });
    setItems((prev) => prev.filter((x) => x.connectionId !== id));
  }

  async function withdraw(id: string): Promise<void> {
    const token = await getAccessToken();
    if (!token) return;
    await apiFetch(`/connections/${id}/withdraw`, Raw, {
      method: "POST",
      token,
    });
    setItems((prev) => prev.filter((x) => x.connectionId !== id));
  }

  async function remove(id: string): Promise<void> {
    const token = await getAccessToken();
    if (!token) return;
    await apiFetch(`/connections/${id}`, Raw, {
      method: "DELETE",
      token,
    });
    setItems((prev) => prev.filter((x) => x.connectionId !== id));
  }

  return (
    <SafeAreaView className="bg-surface-muted flex-1">
      <View className="flex-1 px-4 pt-8">
        <Text className="text-ink mb-3 text-3xl font-bold">{t("network.title")}</Text>

        <View className="mb-3 flex-row gap-2">
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
          ItemSeparatorComponent={() => <View className="h-2" />}
          ListEmptyComponent={
            loading ? (
              <View className="py-6">
                <ActivityIndicator />
              </View>
            ) : (
              <View className="border-ink-muted/20 bg-surface rounded-md border p-6">
                <Text className="text-ink-muted">{t("network.empty")}</Text>
              </View>
            )
          }
          renderItem={({ item: c }) => (
            <View className="border-ink-muted/20 bg-surface flex-row items-center justify-between rounded-md border p-3">
              <Pressable
                onPress={() => router.push(`/(app)/in/${c.user.handle}`)}
                className="flex-1"
              >
                <Text className="text-ink font-semibold">
                  {c.user.firstName} {c.user.lastName}
                </Text>
                {c.user.headline ? (
                  <Text className="text-ink-muted text-sm">{c.user.headline}</Text>
                ) : null}
              </Pressable>

              {filter === "INCOMING" ? (
                <View className="flex-row gap-2">
                  <Pressable
                    onPress={() => void respond(c.connectionId, "ACCEPT")}
                    className="bg-brand-600 rounded-md px-3 py-1.5"
                  >
                    <Text className="text-ink-inverse text-xs">{t("network.accept")}</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => void respond(c.connectionId, "DECLINE")}
                    className="border-ink-muted/30 rounded-md border px-3 py-1.5"
                  >
                    <Text className="text-ink text-xs">{t("network.decline")}</Text>
                  </Pressable>
                </View>
              ) : filter === "OUTGOING" ? (
                <Pressable
                  onPress={() => void withdraw(c.connectionId)}
                  className="border-ink-muted/30 rounded-md border px-3 py-1.5"
                >
                  <Text className="text-ink text-xs">{t("network.withdraw")}</Text>
                </Pressable>
              ) : (
                <Pressable
                  onPress={() => void remove(c.connectionId)}
                  className="border-ink-muted/30 rounded-md border px-3 py-1.5"
                >
                  <Text className="text-ink text-xs">{t("network.removeConnection")}</Text>
                </Pressable>
              )}
            </View>
          )}
        />
      </View>
    </SafeAreaView>
  );
}

function FilterTab({
  active,
  onPress,
  children,
}: {
  active: boolean;
  onPress: () => void;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      className={
        active
          ? "bg-brand-600 rounded-md px-3 py-1.5"
          : "border-ink-muted/30 rounded-md border px-3 py-1.5"
      }
    >
      <Text className={active ? "text-ink-inverse text-xs font-semibold" : "text-ink text-xs"}>
        {children}
      </Text>
    </Pressable>
  );
}
