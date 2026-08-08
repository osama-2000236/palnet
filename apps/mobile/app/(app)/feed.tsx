import {
  cursorPage,
  formatRelativeTime,
  getBandwidthPolicy,
  offlineCacheKeys,
  readThrough,
  Post as PostSchema,
  Profile as ProfileSchema,
  type Post,
  type Profile,
} from "@baydar/shared";
import {
  Alert,
  EmptyState,
  ComposerEntry,
  PostCardSkeleton,
  useThemeTokens,
} from "@baydar/ui-native";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { FlatList, RefreshControl, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PostRow } from "@/components/rows/PostRow";
import { apiFetch, apiFetchPage } from "@/lib/api";
import { offlineCache } from "@/lib/offline-cache";
import { track } from "@/lib/analytics";
import { getAccessToken, readSession } from "@/lib/session";

import { OutboxTrayHost } from "@/components/OutboxTrayHost";
import { FeedTopBar, JobsEntry, ProfileSummary } from "@/screens/feed/FeedParts";
import { useFeedStyles } from "@/screens/feed/styles";

const FeedPage = cursorPage(PostSchema);
const UnreadCountEnvelope = z.object({ count: z.number().int().nonnegative() });

export default function FeedScreen(): JSX.Element {
  const c = useThemeTokens().color;
  const { t, i18n } = useTranslation();
  const feedStyles = useFeedStyles();
  const [posts, setPosts] = useState<Post[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  // Non-null only when the page came from the cache. Stale data presented as
  // live is worse than no data — a member acts on it.
  const [staleSince, setStaleSince] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [unread, setUnread] = useState<number>(0);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [feedError, setFeedError] = useState<string | null>(null);

  const loadUnread = useCallback(async (): Promise<void> => {
    const token = await getAccessToken();
    if (!token) return;
    try {
      const out = await apiFetch("/notifications/unread-count", UnreadCountEnvelope, { token });
      setUnread(out.count);
    } catch {
      /* ignore */
    }
  }, []);

  const loadProfile = useCallback(async (): Promise<void> => {
    const token = await getAccessToken();
    if (!token) return;
    try {
      const next = await apiFetch("/profiles/me", ProfileSchema, { token });
      setProfile(next);
    } catch {
      /* the app gate handles missing profiles; keep the feed usable */
    }
  }, []);

  const load = useCallback(
    async (after: string | null): Promise<void> => {
      const token = await getAccessToken();
      if (!token) return;
      setLoading(true);
      if (!after) setFeedError(null);
      try {
        // Page size follows the mode: five posts on 2G, ten otherwise.
        const qs = new URLSearchParams({ limit: String(getBandwidthPolicy().pageSize) });
        if (after) qs.set("after", after);
        // Stale-while-revalidate: on a dead 2G link the member sees the last
        // page their phone held, with «آخر تحديث» over it, rather than an
        // error over data they already have.
        const {
          body: page,
          stale,
          storedAt,
        } = await readThrough(offlineCache, offlineCacheKeys.feed, () =>
          apiFetchPage(`/feed?${qs.toString()}`, FeedPage, { token }),
        );
        setStaleSince(stale ? storedAt : null);
        setPosts((prev) => (after ? [...prev, ...page.data] : page.data));
        setCursor(page.meta.nextCursor);
        setHasMore(page.meta.hasMore);
      } catch {
        if (!after) setFeedError(t("feed.error"));
      } finally {
        setLoading(false);
      }
    },
    [t],
  );

  const refreshFeed = useCallback(async (): Promise<void> => {
    setRefreshing(true);
    try {
      await Promise.all([load(null), loadUnread(), loadProfile()]);
      track("feed.refresh");
    } finally {
      setRefreshing(false);
    }
  }, [load, loadProfile, loadUnread]);

  useEffect(() => {
    void (async () => {
      const session = await readSession();
      if (!session) router.replace("/(auth)/login");
    })();
  }, []);

  // Reload on focus, not just mount — expo-router keeps this screen mounted, so
  // returning from the composer or the profile editor must refresh the posts and
  // the profile card, not only the unread badge. Same pattern as saved/me (#79).
  useFocusEffect(
    useCallback(() => {
      void loadProfile();
      void load(null);
      void loadUnread();
    }, [load, loadProfile, loadUnread]),
  );

  return (
    <SafeAreaView style={feedStyles.screen}>
      <View style={feedStyles.content}>
        {/* Only the top bar is pinned. Everything else rides in
            ListHeaderComponent so it scrolls away and posts get the whole
            screen — as siblings they permanently ate ~half the viewport and
            the feed was stuck in a stub window. */}
        <FeedTopBar unread={unread} />

        <FlatList
          data={posts}
          keyExtractor={(p) => p.id}
          ListHeaderComponent={
            <>
              {/* Above the composer: a member who lost a post is here to find
                  it, not to write another one. */}
              <OutboxTrayHost />
              {staleSince ? (
                <Text style={feedStyles.staleNote}>
                  {t("connection.lastUpdated", {
                    when: formatRelativeTime(new Date(staleSince).toISOString(), i18n.language),
                  })}
                </Text>
              ) : null}
              <ComposerEntry
                user={
                  profile
                    ? {
                        id: profile.userId,
                        handle: profile.handle,
                        firstName: profile.firstName,
                        lastName: profile.lastName,
                        avatarUrl: profile.avatarUrl,
                      }
                    : null
                }
                placeholder={t("composer.placeholder")}
                actionLabel={t("composer.title")}
                onPress={() => router.push("/(app)/composer")}
                testID="feed-composer-entry"
                style={feedStyles.composerWrap}
              />

              {profile ? <ProfileSummary profile={profile} /> : null}

              <JobsEntry />

              {feedError ? (
                <Alert
                  body={feedError}
                  cta={t("common.retry")}
                  busy={loading}
                  onAction={() => void load(null)}
                  kind="danger"
                  style={feedStyles.errorBox}
                />
              ) : null}
            </>
          }
          renderItem={({ item }) => (
            <PostRow
              post={item}
              onChange={(next) =>
                setPosts((prev) => prev.map((x) => (x.id === next.id ? next : x)))
              }
            />
          )}
          ItemSeparatorComponent={() => <View style={feedStyles.separator} />}
          contentContainerStyle={feedStyles.listContent}
          showsVerticalScrollIndicator={false}
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (!loading && hasMore && cursor) void load(cursor);
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void refreshFeed()}
              tintColor={c.brand600}
              colors={[c.brand600]}
            />
          }
          ListEmptyComponent={
            loading ? (
              <View style={feedStyles.skeletonStack}>
                <PostCardSkeleton />
                <PostCardSkeleton />
                <PostCardSkeleton />
              </View>
            ) : (
              <EmptyState motif="feed" title={t("feed.empty")} />
            )
          }
          ListFooterComponent={
            loading && posts.length > 0 ? (
              <View style={feedStyles.footerLoading}>
                <PostCardSkeleton />
              </View>
            ) : null
          }
        />
      </View>
    </SafeAreaView>
  );
}
