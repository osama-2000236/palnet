import {
  Bookmark,
  BookmarkType,
  cursorPage,
  formatRelativeTime,
  type Bookmark as BookmarkDto,
} from "@baydar/shared";
import {
  AppHeader,
  Button,
  Icon,
  RecordCardSkeleton,
  Surface,
  useToast,
  useThemeTokens,
} from "@baydar/ui-native";
import { Image } from "expo-image";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { StateMessage } from "@/components/StateMessage";
import { apiCall, apiFetchPage } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-errors";
import { getAccessToken } from "@/lib/session";

import { useStyles } from "./_saved/styles";

const SavedPage = cursorPage(Bookmark);

function buildQs(after: string | null): string {
  const qs = new URLSearchParams({ limit: "20" });
  if (after) qs.set("after", after);
  return qs.toString();
}

export default function SavedScreen(): JSX.Element {
  const c = useThemeTokens().color;
  const styles = useStyles();
  const { t, i18n } = useTranslation();
  const { showToast } = useToast();
  const [items, setItems] = useState<BookmarkDto[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [firstLoad, setFirstLoad] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const load = useCallback(
    async (after: string | null): Promise<void> => {
      const token = await getAccessToken();
      if (!token) return;
      setLoading(true);
      if (!after) setError(null);
      try {
        const page = await apiFetchPage(`/bookmarks?${buildQs(after)}`, SavedPage, { token });
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

  // Reload on focus, not just on mount: expo-router keeps this screen mounted,
  // so saving a post from the feed and coming back showed the stale (usually
  // empty) list forever. Same pattern as feed/messages/notifications.
  useFocusEffect(
    useCallback(() => {
      void load(null);
    }, [load]),
  );

  const refreshSaved = useCallback(async (): Promise<void> => {
    setRefreshing(true);
    try {
      await load(null);
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const remove = useCallback(
    async (item: BookmarkDto): Promise<void> => {
      const token = await getAccessToken();
      if (!token || removingId) return;
      const before = items;
      setRemovingId(item.id);
      setItems((prev) => prev.filter((current) => current.id !== item.id));
      try {
        await apiCall(`/bookmarks/${item.id}`, { method: "DELETE", token });
        showToast({ message: t("saved.removed"), kind: "success" });
      } catch {
        setItems(before);
        showToast({ message: t("saved.removeFailed"), kind: "error" });
      } finally {
        setRemovingId(null);
      }
    },
    [items, removingId, showToast, t],
  );

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <AppHeader
          title={t("saved.title")}
          subtitle={t("saved.subtitle")}
          trailing={
            <Button variant="ghost" size="sm" onPress={() => router.back()}>
              {t("common.back")}
            </Button>
          }
        />

        {firstLoad ? (
          <View style={styles.stack}>
            <RecordCardSkeleton />
            <RecordCardSkeleton />
            <RecordCardSkeleton />
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <SavedRow
                metaLabel={jobMetaLabel(item, t)}
                item={item}
                savedLabel={formatRelativeTime(item.savedAt, i18n.language)}
                typeLabel={t(`saved.types.${item.type}`)}
                removeLabel={t("saved.remove")}
                removing={removingId === item.id}
                onOpen={() => openSavedItem(item)}
                onRemove={() => void remove(item)}
              />
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            onEndReachedThreshold={0.4}
            onEndReached={() => {
              if (!loading && hasMore && cursor) void load(cursor);
            }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => void refreshSaved()}
                tintColor={c.brand600}
                colors={[c.brand600]}
              />
            }
            ListEmptyComponent={
              error ? (
                <StateMessage
                  message={error}
                  actionLabel={t("common.retry")}
                  busy={loading}
                  onAction={() => void load(null)}
                />
              ) : (
                <StateMessage message={t("saved.empty")} role="text" />
              )
            }
            ListFooterComponent={
              loading && items.length > 0 ? (
                <View style={styles.footer}>
                  <RecordCardSkeleton />
                </View>
              ) : null
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

/** Job bookmarks carry raw enums; their Arabic labels live in this catalog. */
function jobMetaLabel(item: BookmarkDto, t: (key: string) => string): string | null {
  if (!item.jobMeta) return null;
  return [
    item.jobMeta.city,
    t(`jobs.locationLabels.${item.jobMeta.locationMode}`),
    t(`jobs.typeLabels.${item.jobMeta.type}`),
  ]
    .filter(Boolean)
    .join(" · ");
}

function SavedRow({
  item,
  metaLabel,
  typeLabel,
  savedLabel,
  removeLabel,
  removing,
  onOpen,
  onRemove,
}: {
  item: BookmarkDto;
  metaLabel: string | null;
  typeLabel: string;
  savedLabel: string;
  removeLabel: string;
  removing: boolean;
  onOpen: () => void;
  onRemove: () => void;
}): JSX.Element {
  const c = useThemeTokens().color;
  const styles = useStyles();
  return (
    <Surface variant="card" padding="4">
      <Pressable
        onPress={onOpen}
        accessibilityRole="link"
        accessibilityLabel={item.title}
        style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}
      >
        <View style={styles.imageBox}>
          {item.imageUrl ? (
            <Image
              source={{ uri: item.imageUrl }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
            />
          ) : (
            <Icon
              name={item.type === BookmarkType.JOB ? "briefcase" : "bookmark"}
              size={20}
              color={c.inkMuted}
            />
          )}
        </View>
        <View style={styles.textWrap}>
          <Text selectable numberOfLines={1} style={styles.title}>
            {item.title}
          </Text>
          {item.subtitle ? (
            <Text selectable numberOfLines={1} style={styles.subtitle}>
              {item.subtitle}
            </Text>
          ) : null}
          {metaLabel ? (
            <Text selectable numberOfLines={1} style={styles.description}>
              {metaLabel}
            </Text>
          ) : null}
          {item.description ? (
            <Text selectable numberOfLines={2} style={styles.description}>
              {item.description}
            </Text>
          ) : null}
          <Text selectable numberOfLines={1} style={styles.meta}>
            {typeLabel} · {savedLabel}
          </Text>
        </View>
        <Pressable
          onPress={onRemove}
          disabled={removing}
          accessibilityRole="button"
          accessibilityLabel={removeLabel}
          hitSlop={8}
          style={({ pressed }) => [
            styles.removeButton,
            pressed && !removing ? styles.pressed : null,
            removing ? styles.disabled : null,
          ]}
        >
          <Icon name="x" size={18} color={c.inkMuted} />
        </Pressable>
      </Pressable>
    </Surface>
  );
}

function openSavedItem(item: BookmarkDto): void {
  if (item.type === BookmarkType.JOB) {
    router.push({ pathname: "/(app)/jobs/[id]", params: { id: item.targetId } });
    return;
  }
  router.push("/(app)/feed");
}
