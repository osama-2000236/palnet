import type { ConnectionListItem } from "@baydar/shared";
import { Alert, EmptyState, RecordCardSkeleton } from "@baydar/ui-native";
import { useTranslation } from "react-i18next";
import { FlatList, RefreshControl, View } from "react-native";

import { useThemeTokens } from "@baydar/ui-native";

import { ConnectionRow, type NetworkFilter } from "@/screens/network/ConnectionRow";
import { useStyles } from "@/screens/network/styles";

export interface ConnectionListProps {
  filter: NetworkFilter;
  items: ConnectionListItem[];
  loading: boolean;
  error: string | null;
  refreshing: boolean;
  pendingIds: Set<string>;
  onRefresh: () => void;
  onRetry: () => void;
  onRespond: (id: string, action: "ACCEPT" | "DECLINE") => Promise<void>;
  onWithdraw: (id: string) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}

/**
 * The three connection tabs' list.
 *
 * Its own component because the screen now hosts three different panels — a
 * connection list, suggestions and followers — and a screen that switches
 * between panels should not also own one of them.
 */
export function ConnectionList({
  filter,
  items,
  loading,
  error,
  refreshing,
  pendingIds,
  onRefresh,
  onRetry,
  onRespond,
  onWithdraw,
  onRemove,
}: ConnectionListProps): JSX.Element {
  const { t } = useTranslation();
  const styles = useStyles();
  const c = useThemeTokens().color;

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.connectionId}
      contentContainerStyle={styles.listContent}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
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
          <Alert body={error} cta={t("common.retry")} busy={loading} onAction={onRetry} />
        ) : (
          <EmptyState motif="network" title={t("network.empty")} />
        )
      }
      renderItem={({ item }) => (
        <ConnectionRow
          item={item}
          filter={filter}
          onRespond={onRespond}
          onWithdraw={onWithdraw}
          onRemove={onRemove}
          pending={pendingIds.has(item.connectionId)}
        />
      )}
    />
  );
}
