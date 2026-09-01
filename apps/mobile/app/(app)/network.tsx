import {
  ConnectionCounts,
  ConnectionListItem as ConnectionListItemSchema,
  formatNumber,
  type ConnectionCounts as ConnectionCountsDto,
  type ConnectionListItem,
} from "@baydar/shared";
import {
  Alert,
  EmptyState,
  AppBand,
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
  const { t, i18n } = useTranslation();
  const [filter, setFilter] = useState<NetworkFilter>("ACCEPTED");
  const [items, setItems] = useState<ConnectionListItem[]>([]);
  const [counts, setCounts] = useState<ConnectionCountsDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<string>>(() => new Set());
  const filterItems = useMemo(
    () => [
      {
        key: "ACCEPTED" as const,
        label: t("network.myConnections"),
        count: counts?.accepted,
        testID: "network-filter-accepted",
      },
      {
        key: "INCOMING" as const,
        label: t("network.invitations"),
        count: counts?.incoming,
        testID: "network-filter-incoming",
      },
      {
        key: "OUTGOING" as const,
        label: t("network.sent"),
        count: counts?.outgoing,
        testID: "network-filter-outgoing",
      },
    ],
    [t, counts],
  );

  const load = useCallback(
    async (f: NetworkFilter): Promise<void> => {
      const token = await getAccessToken();
      if (!token) return;
      setLoading(true);
      setError(null);
      try {
        // Counts alongside the list, not derived from it: this response holds
        // one filter, and the strip labels all three. A failed count must not
        // fail the screen, so the tabs just go back to bare labels.
        const [data, nextCounts] = await Promise.all([
          apiFetch(`/connections?filter=${f}`, ListEnvelope, { token }),
          apiFetch("/connections/counts", ConnectionCounts, { token }).catch(() => null),
        ]);
        setItems(data);
        setCounts(nextCounts);
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
        // Every mutation here moves a row between two of the three tabs, so the
        // strip is stale the moment one lands. Re-reading the counts is one
        // request; re-reading the list would flash the rows that did not move.
        const token = await getAccessToken();
        if (token) {
          setCounts(
            await apiFetch("/connections/counts", ConnectionCounts, { token }).catch(() => null),
          );
        }
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
    <SafeAreaView edges={["left", "right", "bottom"]} style={styles.screen}>
      <AppBand title={t("network.title")} density="compact" />
      <View style={styles.content}>
        <Tabs
          value={filter}
          onChange={(key) => setFilter(key as NetworkFilter)}
          formatCount={(value) => formatNumber(value, i18n.language)}
          style={styles.tabs}
          testID="network-filter-tabs"
        >
          {filterItems.map((item) => (
            <Tab key={item.key} value={item.key} count={item.count} testID={item.testID}>
              {item.label}
            </Tab>
          ))}
        </Tabs>

        {error && items.length > 0 ? (
          <Alert
            body={error}
            cta={t("common.retry")}
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
              <Alert
                body={error}
                cta={t("common.retry")}
                busy={loading}
                onAction={() => void load(filter)}
              />
            ) : (
              <EmptyState
                motif="network"
                title={t(`network.${EMPTY_COPY[filter].title}`)}
                body={t(`network.${EMPTY_COPY[filter].body}`)}
              />
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

// One "nothing here yet" for three different situations is three wrong
// answers. Web has told them apart since the tab strip was built; this is the
// mobile twin of its EMPTY_STATE_COPY.
const EMPTY_COPY = {
  ACCEPTED: { title: "emptyConnectionsTitle", body: "emptyConnectionsBody" },
  INCOMING: { title: "emptyIncomingTitle", body: "emptyIncomingBody" },
  OUTGOING: { title: "emptyOutgoingTitle", body: "emptyOutgoingBody" },
} as const satisfies Record<NetworkFilter, { title: string; body: string }>;
