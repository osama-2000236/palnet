import {
  SearchCompanyHit as SearchCompanyHitSchema,
  cursorPage,
  SearchJobHit as SearchJobHitSchema,
  SearchPersonHit as SearchPersonHitSchema,
  SearchPostHit as SearchPostHitSchema,
  type SearchCompanyHit,
  type SearchJobHit,
  type SearchPersonHit,
  type SearchPostHit,
} from "@baydar/shared";
import {
  AppHeader,
  RecordCardSkeleton,
  SearchField,
  SegmentedControl,
  nativeTokens,
  useThemeTokens,
  type NativeTheme,
} from "@baydar/ui-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { StateMessage } from "@/components/StateMessage";
import { apiFetchPage } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-errors";
import { getAccessToken } from "@/lib/session";

import { SearchRow } from "./_search/SearchRow";

const PeoplePage = cursorPage(SearchPersonHitSchema);
const PostsPage = cursorPage(SearchPostHitSchema);
const JobsPage = cursorPage(SearchJobHitSchema);
const CompaniesPage = cursorPage(SearchCompanyHitSchema);

type SearchType = "people" | "posts" | "jobs" | "companies";
type SearchHit = SearchPersonHit | SearchPostHit | SearchJobHit | SearchCompanyHit;

export default function SearchScreen(): JSX.Element {
  const styles = useStyles();
  const { t } = useTranslation();
  const [type, setType] = useState<SearchType>("people");
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tabs = useMemo(
    () => [
      { key: "people" as const, label: t("search.tabs.people"), testID: "search-tab-people" },
      { key: "posts" as const, label: t("search.tabs.posts"), testID: "search-tab-posts" },
      { key: "jobs" as const, label: t("search.tabs.jobs"), testID: "search-tab-jobs" },
      {
        key: "companies" as const,
        label: t("search.tabs.companies"),
        testID: "search-tab-companies",
      },
    ],
    [t],
  );

  const run = useCallback(
    async (nextType: SearchType, term: string, after: string | null): Promise<void> => {
      const trimmed = term.trim();
      if (!trimmed) {
        setHits([]);
        setHasMore(false);
        setCursor(null);
        setLoading(false);
        setError(null);
        return;
      }
      setLoading(true);
      if (!after) setError(null);
      try {
        const token = (await getAccessToken()) ?? undefined;
        const qs = new URLSearchParams({ q: trimmed, limit: "20" });
        if (after) qs.set("after", after);
        const page = await fetchSearchPage(nextType, qs.toString(), token);
        setHits((prev) => (after ? [...prev, ...page.data] : page.data));
        setCursor(page.meta.nextCursor);
        setHasMore(page.meta.hasMore);
      } catch (caught) {
        if (!after) setError(apiErrorMessage(t, caught));
      } finally {
        setLoading(false);
      }
    },
    [t],
  );

  useEffect(() => {
    const trimmed = q.trim();
    if (!trimmed) {
      setTouched(false);
      setHits([]);
      setHasMore(false);
      setCursor(null);
      setLoading(false);
      return;
    }
    setTouched(true);
    const timeout = setTimeout(() => {
      void run(type, trimmed, null);
    }, 250);
    return () => clearTimeout(timeout);
  }, [q, run, type]);

  function changeType(nextType: SearchType): void {
    setType(nextType);
    setHits([]);
    setCursor(null);
    setHasMore(false);
    setError(null);
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <AppHeader
          title={t("search.title")}
          search={
            <SearchField
              value={q}
              onChangeText={setQ}
              onClear={() => setQ("")}
              clearLabel={t("common.clear")}
              placeholder={t("search.placeholder")}
              accessibilityLabel={t("search.placeholder")}
              testID="search-input"
              inputDirection="auto"
              onSubmitEditing={() => {
                setTouched(true);
                void run(type, q, null);
              }}
            />
          }
        />

        <SegmentedControl
          items={tabs}
          selectedKey={type}
          onChange={changeType}
          style={styles.tabs}
          testID="search-tabs"
        />

        <FlatList
          data={hits}
          keyExtractor={(item) => ("userId" in item ? item.userId : item.id)}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => <SearchRow type={type} item={item} />}
          onEndReachedThreshold={0.5}
          onEndReached={() => {
            if (!loading && hasMore && cursor) void run(type, q, cursor);
          }}
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
                onAction={() => void run(type, q, null)}
              />
            ) : (
              <StateMessage
                message={touched ? t(`search.empty.${type}`) : t("search.prompt")}
                role="text"
              />
            )
          }
        />
      </View>
    </SafeAreaView>
  );
}

async function fetchSearchPage(type: SearchType, qs: string, token: string | undefined) {
  const path = `/search/${type}?${qs}`;
  if (type === "people") return apiFetchPage(path, PeoplePage, { token });
  if (type === "posts") return apiFetchPage(path, PostsPage, { token });
  if (type === "jobs") return apiFetchPage(path, JobsPage, { token });
  return apiFetchPage(path, CompaniesPage, { token });
}

function makeStyles(c: NativeTheme["color"]) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: c.surfaceMuted,
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
  });
}

function useStyles() {
  const c = useThemeTokens().color;
  return useMemo(() => makeStyles(c), [c]);
}
