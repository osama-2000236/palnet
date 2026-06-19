// Mobile jobs list. Jobs are reached from feed/search content rather than the
// bottom shell, so this route keeps a compact header and dense record rhythm.

import { Bookmark, BookmarkType, cursorPage, Job as JobSchema, type Job } from "@baydar/shared";
import {
  AppHeader,
  Button,
  Chip,
  Icon,
  RecordCardSkeleton,
  SearchField,
  nativeTokens,
} from "@baydar/ui-native";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, RefreshControl, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { StateMessage } from "@/components/StateMessage";
import { JobRow } from "@/components/rows/JobRow";
import { apiCall, apiFetch, apiFetchPage } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-errors";
import { getAccessToken } from "@/lib/session";

import {
  EMPTY_FILTERS,
  FilterSheet,
  activeFilterCount,
  buildQs,
  type Filters,
} from "../_jobs/filters";

const JobsPage = cursorPage(JobSchema);

export default function JobsScreen(): JSX.Element {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ companyId?: string; company?: string }>();
  const [items, setItems] = useState<Job[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [firstLoad, setFirstLoad] = useState(true);
  const [filters, setFilters] = useState<Filters>(() => ({
    ...EMPTY_FILTERS,
    companyId: typeof params.companyId === "string" ? params.companyId : "",
    companyName: typeof params.company === "string" ? params.company : "",
  }));
  const [sheetOpen, setSheetOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(
    async (after: string | null, f: Filters): Promise<void> => {
      const token = await getAccessToken();
      if (!token) return;
      setLoading(true);
      if (!after) setError(null);
      try {
        const page = await apiFetchPage(`/jobs?${buildQs(f, after)}`, JobsPage, { token });
        setItems((prev) => (after ? [...prev, ...page.data] : page.data));
        setCursor(page.meta.nextCursor);
        setHasMore(page.meta.hasMore);
      } catch (caught) {
        if (!after) setError(apiErrorMessage(t, caught));
      } finally {
        setLoading(false);
        setFirstLoad(false);
      }
    },
    [t],
  );

  // Debounced refetch when filters change. Reset cursor on every filter edit.
  useEffect(() => {
    const handle = setTimeout(() => {
      void load(null, filters);
    }, 250);
    return (): void => clearTimeout(handle);
  }, [filters, load]);

  const activeCount = useMemo(() => activeFilterCount(filters), [filters]);
  const refreshJobs = useCallback(async (): Promise<void> => {
    setRefreshing(true);
    try {
      await load(null, filters);
    } finally {
      setRefreshing(false);
    }
  }, [filters, load]);

  const toggleSave = useCallback(
    async (job: Job): Promise<void> => {
      if (savingId) return;
      const token = await getAccessToken();
      if (!token) return;
      const bookmarkId = job.viewer.bookmarkId;
      setSavingId(job.id);
      setItems((prev) =>
        prev.map((item) =>
          item.id === job.id
            ? {
                ...item,
                viewer: { ...item.viewer, bookmarkId: bookmarkId ? null : "pending_bookmark" },
              }
            : item,
        ),
      );
      try {
        if (bookmarkId) {
          await apiCall(`/bookmarks/${bookmarkId}`, { method: "DELETE", token });
          return;
        }
        const created = await apiFetch("/bookmarks", Bookmark, {
          method: "POST",
          token,
          body: { type: BookmarkType.JOB, targetId: job.id },
        });
        setItems((prev) =>
          prev.map((item) =>
            item.id === job.id
              ? { ...item, viewer: { ...item.viewer, bookmarkId: created.id } }
              : item,
          ),
        );
      } catch {
        setItems((prev) => prev.map((item) => (item.id === job.id ? job : item)));
      } finally {
        setSavingId(null);
      }
    },
    [savingId],
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: nativeTokens.color.surfaceMuted }}>
      <View
        style={{
          flex: 1,
          paddingHorizontal: nativeTokens.space[4],
          paddingTop: nativeTokens.space[4],
        }}
      >
        <AppHeader
          title={t("jobs.title")}
          subtitle={t("jobs.searchPlaceholder")}
          trailing={
            <Button
              variant={activeCount > 0 ? "primary" : "secondary"}
              size="sm"
              leading={
                <Icon
                  name="search"
                  size={16}
                  color={activeCount > 0 ? nativeTokens.color.inkInverse : nativeTokens.color.ink}
                />
              }
              onPress={() => setSheetOpen(true)}
              accessibilityLabel={t("jobs.filters")}
            >
              {activeCount > 0 ? `${t("jobs.filters")} ${activeCount}` : t("jobs.filters")}
            </Button>
          }
          search={
            <SearchField
              value={filters.q}
              onChangeText={(q) => setFilters((current) => ({ ...current, q }))}
              onClear={() => setFilters((current) => ({ ...current, q: "" }))}
              clearLabel={t("common.clear")}
              placeholder={t("jobs.searchPlaceholder")}
              accessibilityLabel={t("jobs.search")}
              testID="jobs-search-input"
              inputDirection="auto"
            />
          }
        />

        {filters.companyId ? (
          <View
            style={{
              flexDirection: "row",
              paddingBottom: nativeTokens.space[3],
            }}
          >
            <Chip
              active
              onPress={() =>
                setFilters((current) => ({ ...current, companyId: "", companyName: "" }))
              }
              accessibilityLabel={t("jobs.clearCompanyFilter")}
            >
              {`${t("jobs.companyFilter", { name: filters.companyName || filters.companyId })} ✕`}
            </Chip>
          </View>
        ) : null}

        {firstLoad ? (
          <View style={{ gap: nativeTokens.space[3] }}>
            <RecordCardSkeleton />
            <RecordCardSkeleton />
            <RecordCardSkeleton />
          </View>
        ) : (
          <>
            {error && items.length > 0 ? (
              <StateMessage
                message={error}
                actionLabel={t("common.retry")}
                busy={loading}
                onAction={() => void load(null, filters)}
                style={{ marginBottom: nativeTokens.space[3] }}
              />
            ) : null}
            <FlatList
              data={items}
              keyExtractor={(j) => j.id}
              renderItem={({ item }) => (
                <JobRow
                  job={item}
                  saving={savingId === item.id}
                  onToggleSave={() => void toggleSave(item)}
                />
              )}
              ItemSeparatorComponent={() => <View style={{ height: nativeTokens.space[3] }} />}
              onEndReachedThreshold={0.4}
              onEndReached={() => {
                if (!loading && hasMore && cursor) void load(cursor, filters);
              }}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => void refreshJobs()}
                  tintColor={nativeTokens.color.brand600}
                  colors={[nativeTokens.color.brand600]}
                />
              }
              ListEmptyComponent={
                loading ? null : error ? (
                  <StateMessage
                    message={error}
                    actionLabel={t("common.retry")}
                    busy={loading}
                    onAction={() => void load(null, filters)}
                  />
                ) : (
                  <StateMessage message={t("jobs.emptyTitle")} role="text" />
                )
              }
              ListFooterComponent={
                loading && !firstLoad ? (
                  <View style={{ paddingVertical: nativeTokens.space[3] }}>
                    <RecordCardSkeleton />
                  </View>
                ) : null
              }
            />
          </>
        )}
      </View>

      <FilterSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        filters={filters}
        onChange={setFilters}
      />
    </SafeAreaView>
  );
}
