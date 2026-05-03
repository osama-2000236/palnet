import {
  cursorPage,
  SearchPersonHit as SearchPersonHitSchema,
  type SearchPersonHit,
} from "@baydar/shared";
import {
  AppHeader,
  Avatar,
  RecordCard,
  RecordCardSkeleton,
  SearchField,
  nativeTokens,
} from "@baydar/ui-native";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { StateMessage } from "@/components/StateMessage";
import { apiFetchPage } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-errors";
import { getAccessToken } from "@/lib/session";

const PeoplePage = cursorPage(SearchPersonHitSchema);

export default function SearchScreen(): JSX.Element {
  const { t } = useTranslation();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchPersonHit[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (term: string, after: string | null): Promise<void> => {
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
        const page = await apiFetchPage(`/search/people?${qs.toString()}`, PeoplePage, { token });
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
      void run(trimmed, null);
    }, 250);
    return () => clearTimeout(timeout);
  }, [q, run]);

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
                void run(q, null);
              }}
            />
          }
        />

        <FlatList
          data={hits}
          keyExtractor={(p) => p.userId}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => <SearchRow item={item} />}
          onEndReachedThreshold={0.5}
          onEndReached={() => {
            if (!loading && hasMore && cursor) void run(q, cursor);
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
                onAction={() => void run(q, null)}
              />
            ) : (
              <StateMessage
                message={touched ? t("search.noResults") : t("search.prompt")}
                role="text"
              />
            )
          }
        />
      </View>
    </SafeAreaView>
  );
}

function SearchRow({ item }: { item: SearchPersonHit }): JSX.Element {
  const name = `${item.firstName} ${item.lastName}`.trim();
  return (
    <RecordCard
      onPress={() => router.push(`/(app)/in/${item.handle}`)}
      accessibilityLabel={name}
      leading={
        <Avatar
          user={{
            id: item.userId,
            handle: item.handle,
            firstName: item.firstName,
            lastName: item.lastName,
            avatarUrl: item.avatarUrl,
          }}
          size="md"
        />
      }
      title={name}
      subtitle={item.headline}
      meta={`/in/${item.handle}`}
      metaDirection="ltr"
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
