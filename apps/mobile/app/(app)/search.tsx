import {
  cursorPage,
  SearchPersonHit as SearchPersonHitSchema,
  type SearchPersonHit,
} from "@palnet/shared";
import { router } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SafeAreaView,
  Text,
  TextInput,
  View,
} from "react-native";

import { apiFetchPage } from "@/lib/api";
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

  const run = useCallback(
    async (term: string, after: string | null): Promise<void> => {
      if (!term.trim()) {
        setHits([]);
        setHasMore(false);
        setCursor(null);
        return;
      }
      setLoading(true);
      try {
        const token = (await getAccessToken()) ?? undefined;
        const qs = new URLSearchParams({ q: term, limit: "20" });
        if (after) qs.set("after", after);
        const page = await apiFetchPage(
          `/search/people?${qs.toString()}`,
          PeoplePage,
          { token },
        );
        setHits((prev) => (after ? [...prev, ...page.data] : page.data));
        setCursor(page.meta.nextCursor);
        setHasMore(page.meta.hasMore);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return (
    <SafeAreaView className="flex-1 bg-surface-muted" testID="search-screen">
      <View className="flex-1 px-4 pt-8">
        <Text className="mb-3 text-3xl font-bold text-ink">
          {t("search.title")}
        </Text>

        <View className="mb-3 flex-row gap-2">
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder={t("search.placeholder")}
            returnKeyType="search"
            onSubmitEditing={() => {
              setTouched(true);
              void run(q, null);
            }}
            className="flex-1 rounded-md border border-ink-muted/30 bg-surface px-3 py-2 text-ink"
            testID="search-input"
          />
          <Pressable
            onPress={() => {
              setTouched(true);
              void run(q, null);
            }}
            className="rounded-md bg-brand-600 px-4 py-2"
            testID="search-submit"
          >
            <Text className="text-sm font-semibold text-ink-inverse">
              {t("search.submit")}
            </Text>
          </Pressable>
        </View>

        <FlatList
          data={hits}
          keyExtractor={(p) => p.userId}
          ItemSeparatorComponent={() => <View className="h-2" />}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/(app)/in/${item.handle}`)}
              className="rounded-md border border-ink-muted/20 bg-surface p-3"
              testID={`search-result-${item.handle}`}
            >
              <Text className="font-semibold text-ink">
                {item.firstName} {item.lastName}
              </Text>
              <Text className="text-xs text-ink-muted">/in/{item.handle}</Text>
              {item.headline ? (
                <Text className="mt-1 text-sm text-ink-muted">
                  {item.headline}
                </Text>
              ) : null}
            </Pressable>
          )}
          onEndReachedThreshold={0.5}
          onEndReached={() => {
            if (!loading && hasMore && cursor) void run(q, cursor);
          }}
          ListEmptyComponent={
            loading ? null : (
              <View className="rounded-md border border-ink-muted/20 bg-surface p-6">
                <Text className="text-ink-muted">
                  {touched ? t("search.noResults") : t("search.prompt")}
                </Text>
              </View>
            )
          }
          ListFooterComponent={
            loading ? (
              <View className="py-4">
                <ActivityIndicator />
              </View>
            ) : null
          }
        />
      </View>
    </SafeAreaView>
  );
}
