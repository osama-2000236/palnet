import {
  ConnectionListItem as ConnectionListItemSchema,
  type ConnectionListItem,
} from "@baydar/shared";
import {
  EmptyState,
  AppHeader,
  RecordCardSkeleton,
  Tab,
  Tabs,
  useThemeTokens,
} from "@baydar/ui-native";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, RefreshControl, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { z } from "zod";

import { StateMessage } from "@/components/StateMessage";
import { apiFetch } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-errors";
import { successHaptic, tapHaptic } from "@/lib/haptics";
import { getAccessToken, readSession } from "@/lib/session";

import { ConnectionRow, type NetworkFilter } from "@/screens/network/ConnectionRow";
import { useStyles } from "@/screens/network/styles";

const ListEnvelope = z.array(ConnectionListItemSchema);
const Raw = z.object({}).passthrough();

export default function NetworkScreen(): JSX.Element {
  const c = useThemeTokens().color;
  const styles = useStyles();
  const { t } = useTranslation();
  const [filter, setFilter] = useState<NetworkFilter>("ACCEPTED");
  const [items, setItems] = useState<ConnectionListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<string>>(() => new Set());
  const filterItems = useMemo(
    () => [
      {
        key: "ACCEPTED" as const,
        label: t("network.myConnections"),
        testID: "network-filter-accepted",
      },
      {
        key: "INCOMING" as const,
        label: t("network.invitations"),
        testID: "network-filter-incoming",
      },
      { key: "OUTGOING" as const, label: t("network.sent"), testID: "network-filter-outgoing" },
    ],
    [t],
  );

  const load = useCallback(
    async (f: NetworkFilter): Promise<void> => {
      const token = await getAccessToken();
      if (!token) return;
      setLoading(true);
      setError(null);
      try {
        const data = await apiFetch(`/connections?filter=${f}`, ListEnvelope, {
          token,
        });
        setItems(data);
      } catch (caught) {
        setError(apiErrorMessage(t, caught));
      } finally {
        setLoading(false);
      }
    },
    [t],
  );

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

  const runConnectionMutation = useCallback(
    async (id: string, mutation: () => Promise<void>): Promise<void> => {
      setPendingIds((prev) => new Set(prev).add(id));
      setError(null);
      try {
        await mutation();
      } finally {
        setPendingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [],
  );

  async function respond(id: string, action: "ACCEPT" | "DECLINE"): Promise<void> {
    const token = await getAccessToken();
    if (!token) return;
    tapHaptic();
    await runConnectionMutation(id, async () => {
      try {
        await apiFetch(`/connections/${id}/respond`, Raw, {
          method: "POST",
          token,
          body: { action },
        });
        successHaptic();
        setItems((prev) => prev.filter((x) => x.connectionId !== id));
      } catch (caught) {
        setError(apiErrorMessage(t, caught));
      }
    });
  }

  async function withdraw(id: string): Promise<void> {
    const token = await getAccessToken();
    if (!token) return;
    tapHaptic();
    await runConnectionMutation(id, async () => {
      try {
        await apiFetch(`/connections/${id}/withdraw`, Raw, {
          method: "POST",
          token,
        });
        successHaptic();
        setItems((prev) => prev.filter((x) => x.connectionId !== id));
      } catch (caught) {
        setError(apiErrorMessage(t, caught));
      }
    });
  }

  async function remove(id: string): Promise<void> {
    const token = await getAccessToken();
    if (!token) return;
    tapHaptic();
    await runConnectionMutation(id, async () => {
      try {
        await apiFetch(`/connections/${id}`, Raw, {
          method: "DELETE",
          token,
        });
        successHaptic();
        setItems((prev) => prev.filter((x) => x.connectionId !== id));
      } catch (caught) {
        setError(apiErrorMessage(t, caught));
      }
    });
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <AppHeader title={t("network.title")} compact />

        <Tabs
          value={filter}
          onChange={(key) => setFilter(key as NetworkFilter)}
          style={styles.tabs}
          testID="network-filter-tabs"
        >
          {filterItems.map((item) => (
            <Tab key={item.key} value={item.key} testID={item.testID}>
              {item.label}
            </Tab>
          ))}
        </Tabs>

        {error && items.length > 0 ? (
          <StateMessage
            message={error}
            actionLabel={t("common.retry")}
            busy={loading}
            onAction={() => void load(filter)}
            style={styles.inlineError}
          />
        ) : null}

        <FlatList
          data={items}
          keyExtractor={(c) => c.connectionId}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void refresh()}
              tintColor={c.brand600}
              colors={[c.brand600]}
            />
          }
          ListEmptyComponent={
            loading ? (
              <View style={styles.skeletonStack}>
                <RecordCardSkeleton variant="row" />
                <RecordCardSkeleton variant="row" />
                <RecordCardSkeleton variant="row" />
              </View>
            ) : error ? (
              <StateMessage
                message={error}
                actionLabel={t("common.retry")}
                busy={loading}
                onAction={() => void load(filter)}
              />
            ) : (
              <EmptyState motif="network" title={t("network.empty")} />
            )
          }
          renderItem={({ item }) => (
            <ConnectionRow
              item={item}
              filter={filter}
              onRespond={respond}
              onWithdraw={withdraw}
              onRemove={remove}
              pending={pendingIds.has(item.connectionId)}
            />
          )}
        />
      </View>
    </SafeAreaView>
  );
}
