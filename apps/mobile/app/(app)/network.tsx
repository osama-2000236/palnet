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

import { apiFetch } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-errors";
import { successHaptic, tapHaptic } from "@/lib/haptics";
import { getAccessToken, readSession } from "@/lib/session";

import { ConnectionRow, type NetworkFilter } from "@/screens/network/ConnectionRow";

/** The tab strip's own union. */
type NetworkTab = NetworkFilter | "SUGGESTIONS" | "FOLLOWERS";

/**
 * The connection list only exists for the three connection tabs.
 *
 * Narrowing here rather than widening `load` keeps the suggestions tab from
 * ever issuing a connection query — a wasted round trip on a connection that
 * cannot afford one.
 */
const connectionFilter = (tab: NetworkTab): NetworkFilter | null =>
  tab === "SUGGESTIONS" || tab === "FOLLOWERS" ? null : tab;
import { ConnectionList } from "@/screens/network/ConnectionList";
import { FollowersPanel } from "@/screens/network/FollowersPanel";
import { SuggestionsPanel } from "@/screens/network/SuggestionsPanel";
import { useStyles } from "@/screens/network/styles";

const ListEnvelope = z.array(ConnectionListItemSchema);
const Raw = z.object({}).passthrough();

export default function NetworkScreen(): JSX.Element {
  const c = useThemeTokens().color;
  const styles = useStyles();
  const { t, i18n } = useTranslation();
  // A superset of NetworkFilter: the suggestions tab renders its own panel
  // rather than a connection list, so no row can be built for it and the row
  // component's union deliberately excludes it.
  const [filter, setFilter] = useState<NetworkTab>("ACCEPTED");
  const [items, setItems] = useState<ConnectionListItem[]>([]);
  const [counts, setCounts] = useState<ConnectionCountsDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<string>>(() => new Set());
  const listed = connectionFilter(filter);

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
      // The asymmetric half. Alongside "sent" rather than replacing it:
      // withdrawing an outgoing request is a real thing to need, and the
      // spec's four tabs do not include it. The strip is a ScrollView, so a
      // fifth tab has nowhere to wrap to.
      {
        key: "SUGGESTIONS" as const,
        label: t("discovery.tabs.suggestions"),
        count: undefined,
        testID: "network-filter-suggestions",
      },
      {
        key: "FOLLOWERS" as const,
        label: t("discovery.tabs.followers"),
        count: undefined,
        testID: "network-filter-followers",
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
      const listed = connectionFilter(filter);
      if (listed) await load(listed);
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
      const listed = connectionFilter(filter);
      if (listed) await load(listed);
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
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <AppHeader title={t("network.title")} compact />

        <Tabs
          value={filter}
          onChange={(key) => setFilter(key as NetworkTab)}
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
            onAction={() => {
              const listed = connectionFilter(filter);
              if (listed) void load(listed);
            }}
            style={styles.inlineError}
          />
        ) : null}

        {filter === "SUGGESTIONS" ? <SuggestionsPanel /> : null}
        {filter === "FOLLOWERS" ? <FollowersPanel /> : null}

        {listed ? (
          <ConnectionList
            filter={listed}
            items={items}
            loading={loading}
            error={error}
            refreshing={refreshing}
            pendingIds={pendingIds}
            onRefresh={() => void refresh()}
            onRetry={() => void load(listed)}
            onRespond={respond}
            onWithdraw={withdraw}
            onRemove={remove}
          />
        ) : null}
      </View>
    </SafeAreaView>
  );
}
