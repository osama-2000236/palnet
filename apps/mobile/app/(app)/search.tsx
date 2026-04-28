import {
  cursorPage,
  SearchPersonHit as SearchPersonHitSchema,
  type SearchPersonHit,
} from "@baydar/shared";
import { Avatar, Button, Icon, Surface, nativeTokens } from "@baydar/ui-native";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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
    const trimmed = term.trim();
    if (!trimmed) {
      setHits([]);
      setHasMore(false);
      setCursor(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const token = (await getAccessToken()) ?? undefined;
      const qs = new URLSearchParams({ q: trimmed, limit: "20" });
      if (after) qs.set("after", after);
      const page = await apiFetchPage(`/search/people?${qs.toString()}`, PeoplePage, { token });
      setHits((prev) => (after ? [...prev, ...page.data] : page.data));
      setCursor(page.meta.nextCursor);
      setHasMore(page.meta.hasMore);
    } finally {
      setLoading(false);
    }
  }, []);

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
        <Text style={styles.title}>{t("search.title")}</Text>

        <View style={styles.searchRow}>
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder={t("search.placeholder")}
            placeholderTextColor={nativeTokens.color.inkMuted}
            returnKeyType="search"
            onSubmitEditing={() => {
              setTouched(true);
              void run(q, null);
            }}
            style={styles.input}
          />
          <Button
            size="md"
            onPress={() => {
              setTouched(true);
              void run(q, null);
            }}
            accessibilityLabel={t("search.submit")}
          >
            {t("search.submit")}
          </Button>
        </View>

        <Button
          variant="ghost"
          size="sm"
          leading={
            <Icon name="search" size={nativeTokens.space[4]} color={nativeTokens.color.inkMuted} />
          }
          onPress={() => undefined}
          accessibilityLabel={t("search.filters")}
          style={styles.filterButton}
          textStyle={styles.filterButtonText}
        >
          {t("search.filters")}
        </Button>

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
            loading ? null : (
              <Surface variant="tinted" padding="6">
                <Text style={styles.emptyText}>
                  {touched ? t("search.noResults") : t("search.prompt")}
                </Text>
              </Surface>
            )
          }
          ListFooterComponent={
            loading ? (
              <View style={styles.loading}>
                <ActivityIndicator />
              </View>
            ) : null
          }
        />
      </View>
    </SafeAreaView>
  );
}

function SearchRow({ item }: { item: SearchPersonHit }): JSX.Element {
  const name = `${item.firstName} ${item.lastName}`.trim();
  return (
    <Pressable
      onPress={() => router.push(`/(app)/in/${item.handle}`)}
      accessibilityRole="link"
      accessibilityLabel={name}
    >
      <Surface variant="card" padding="4" style={styles.resultRow}>
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
        <View style={styles.resultText}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.handle}>/in/{item.handle}</Text>
          {item.headline ? (
            <Text style={styles.headline} numberOfLines={2}>
              {item.headline}
            </Text>
          ) : null}
        </View>
      </Surface>
    </Pressable>
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
    paddingTop: nativeTokens.space[8],
  },
  title: {
    color: nativeTokens.color.ink,
    fontSize: nativeTokens.type.scale.display.size,
    lineHeight: nativeTokens.type.scale.display.line,
    fontWeight: "700",
    fontFamily: nativeTokens.type.family.sans,
    marginBottom: nativeTokens.space[3],
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: nativeTokens.space[2],
    marginBottom: nativeTokens.space[2],
  },
  input: {
    flex: 1,
    minHeight: nativeTokens.chrome.minHit,
    borderRadius: nativeTokens.radius.md,
    borderWidth: 1,
    borderColor: nativeTokens.color.lineHard,
    backgroundColor: nativeTokens.color.surface,
    paddingHorizontal: nativeTokens.space[3],
    color: nativeTokens.color.ink,
    fontSize: nativeTokens.type.scale.body.size,
    fontFamily: nativeTokens.type.family.sans,
  },
  filterButton: {
    marginBottom: nativeTokens.space[3],
  },
  filterButtonText: {
    color: nativeTokens.color.inkMuted,
  },
  listContent: {
    paddingBottom: nativeTokens.space[6],
  },
  separator: {
    height: nativeTokens.space[2],
  },
  loading: {
    paddingVertical: nativeTokens.space[4],
  },
  resultRow: {
    flexDirection: "row",
    gap: nativeTokens.space[3],
    alignItems: "center",
  },
  resultText: {
    flex: 1,
  },
  name: {
    color: nativeTokens.color.ink,
    fontSize: nativeTokens.type.scale.h3.size,
    lineHeight: nativeTokens.type.scale.h3.line,
    fontWeight: "600",
    fontFamily: nativeTokens.type.family.sans,
  },
  handle: {
    color: nativeTokens.color.inkMuted,
    fontSize: nativeTokens.type.scale.caption.size,
    lineHeight: nativeTokens.type.scale.caption.line,
    fontFamily: nativeTokens.type.family.mono,
  },
  headline: {
    color: nativeTokens.color.inkMuted,
    fontSize: nativeTokens.type.scale.small.size,
    lineHeight: nativeTokens.type.scale.small.line,
    fontFamily: nativeTokens.type.family.sans,
    marginTop: nativeTokens.space[1],
  },
  emptyText: {
    color: nativeTokens.color.inkMuted,
    fontSize: nativeTokens.type.scale.body.size,
    lineHeight: nativeTokens.type.scale.body.line,
    fontFamily: nativeTokens.type.family.sans,
  },
});
