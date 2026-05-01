import {
  ConnectionListItem as ConnectionListItemSchema,
  type ConnectionListItem,
} from "@baydar/shared";
import {
  AppHeader,
  Avatar,
  Button,
  RecordCard,
  RecordCardSkeleton,
  SegmentedControl,
  nativeTokens,
} from "@baydar/ui-native";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, RefreshControl, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { z } from "zod";

import { StateMessage } from "@/components/StateMessage";
import { apiFetch } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-errors";
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
    async (f: Filter): Promise<void> => {
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

        <SegmentedControl
          items={filterItems}
          selectedKey={filter}
          onChange={setFilter}
          style={styles.tabs}
          testID="network-filter-tabs"
        />

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
              tintColor={nativeTokens.color.brand600}
              colors={[nativeTokens.color.brand600]}
            />
          }
          ListEmptyComponent={
            loading ? (
              <View style={styles.skeletonStack}>
                <RecordCardSkeleton />
                <RecordCardSkeleton />
                <RecordCardSkeleton />
              </View>
            ) : error ? (
              <StateMessage
                message={error}
                actionLabel={t("common.retry")}
                busy={loading}
                onAction={() => void load(filter)}
              />
            ) : (
              <StateMessage message={t("network.empty")} role="text" />
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

function ConnectionRow({
  item,
  filter,
  onRespond,
  onWithdraw,
  onRemove,
  pending,
}: {
  item: ConnectionListItem;
  filter: Filter;
  onRespond: (id: string, action: "ACCEPT" | "DECLINE") => Promise<void>;
  onWithdraw: (id: string) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  pending: boolean;
}): JSX.Element {
  const { t } = useTranslation();
  const name = `${item.user.firstName} ${item.user.lastName}`.trim();

  return (
    <RecordCard
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

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: nativeTokens.color.surfaceMuted,
  },
  content: {
    flex: 1,
    paddingHorizontal: nativeTokens.space[4],
    paddingTop: nativeTokens.space[3],
  },
  tabs: {
    marginBottom: nativeTokens.space[3],
  },
  listContent: {
    paddingBottom: nativeTokens.space[6],
  },
  separator: {
    height: nativeTokens.space[2],
  },
  skeletonStack: {
    gap: nativeTokens.space[2],
  },
  inlineError: {
    marginBottom: nativeTokens.space[3],
  },
  actions: {
    flexDirection: "row",
    gap: nativeTokens.space[2],
  },
});
