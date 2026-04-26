import {
  cursorPage,
  SearchPersonHit as SearchPersonHitSchema,
  type SearchPersonHit,
} from "@baydar/shared";
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

  const run = useCallback(async (term: string, after: string | null): Promise<void> => {
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
      const page = await apiFetchPage(`/search/people?${qs.toString()}`, PeoplePage, { token });
      setHits((prev) => (after ? [...prev, ...page.data] : page.data));
      setCursor(page.meta.nextCursor);
      setHasMore(page.meta.hasMore);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <SafeAreaView className="bg-surface-muted flex-1" testID="search-screen">
      <View className="flex-1 px-4 pt-8">
        <Text className="text-ink mb-3 text-3xl font-bold">{t("search.title")}</Text>

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
            className="border-ink-muted/30 bg-surface text-ink flex-1 rounded-md border px-3 py-2"
            testID="search-input"
          />
          <Pressable
            onPress={() => {
              setTouched(true);
              void run(q, null);
            }}
            className="bg-brand-600 rounded-md px-4 py-2"
            testID="search-submit"
          >
            <Text className="text-ink-inverse text-sm font-semibold">{t("search.submit")}</Text>
          </Pressable>
        </View>

        <FlatList
          data={hits}
          keyExtractor={(p) => p.userId}
          ItemSeparatorComponent={() => <View className="h-2" />}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/(app)/in/${item.handle}`)}
              className="border-ink-muted/20 bg-surface rounded-md border p-3"
              testID={`search-result-${item.handle}`}
            >
              <Text className="text-ink font-semibold">
                {item.firstName} {item.lastName}
              </Text>
              <Text className="text-ink-muted text-xs">/in/{item.handle}</Text>
              {item.headline ? (
                <Text className="text-ink-muted mt-1 text-sm">{item.headline}</Text>
              ) : null}
            </Pressable>
          )}
          onEndReachedThreshold={0.5}
          onEndReached={() => {
            if (!loading && hasMore && cursor) void run(q, cursor);
          }}
          ListEmptyComponent={
            loading ? null : (
              <View className="border-ink-muted/20 bg-surface rounded-md border p-6">
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
