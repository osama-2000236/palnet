import {
  cursorPage,
  Post as PostSchema,
  Profile as ProfileSchema,
  type Post,
  type Profile,
} from "@baydar/shared";
import {
  AppHeader,
  Avatar,
  Button,
  ComposerEntry,
  Icon,
  PostCardSkeleton,
  Surface,
  nativeTokens,
} from "@baydar/ui-native";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { StateMessage } from "@/components/StateMessage";
import { PostRow } from "@/components/rows/PostRow";
import { apiFetch, apiFetchPage } from "@/lib/api";
import { track } from "@/lib/analytics";
import { getAccessToken, readSession } from "@/lib/session";

const FeedPage = cursorPage(PostSchema);
const UnreadCountEnvelope = z.object({ count: z.number().int().nonnegative() });

export default function FeedScreen(): JSX.Element {
  const { t } = useTranslation();
  const [posts, setPosts] = useState<Post[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [name, setName] = useState<string | null>(null);
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
      setName(`${next.firstName} ${next.lastName}`.trim());
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
        const qs = new URLSearchParams({ limit: "20" });
        if (after) qs.set("after", after);
        const page = await apiFetchPage(`/feed?${qs.toString()}`, FeedPage, {
          token,
        });
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
      if (!session) {
        router.replace("/(auth)/login");
        return;
      }
      setName(session.user.email.split("@")[0] ?? session.user.email);
      await Promise.all([loadProfile(), load(null), loadUnread()]);
    })();
  }, [load, loadProfile, loadUnread]);

  useFocusEffect(
    useCallback(() => {
      void loadUnread();
    }, [loadUnread]),
  );

  return (
    <SafeAreaView style={feedStyles.screen}>
      <View style={feedStyles.content}>
        <AppHeader
          title={t("feed.title")}
          subtitle={name ? t("feed.welcome", { name }) : undefined}
          leading={
            profile ? (
              <Avatar
                size="sm"
                user={{
                  id: profile.userId,
                  handle: profile.handle,
                  firstName: profile.firstName,
                  lastName: profile.lastName,
                  avatarUrl: profile.avatarUrl,
                }}
              />
            ) : (
              <Icon name="logo" size={34} />
            )
          }
          trailing={
            <Pressable
              onPress={() => router.push("/(app)/notifications")}
              accessibilityRole="button"
              accessibilityLabel={
                unread > 0
                  ? t("nav.unreadNotifications", { count: unread })
                  : t("notifications.title")
              }
              testID="feed-notifications-button"
              style={({ pressed }) => [
                feedStyles.iconButton,
                unread > 0 ? feedStyles.iconButtonActive : null,
                pressed ? feedStyles.pressed : null,
              ]}
            >
              <Icon
                name="bell"
                size={20}
                color={unread > 0 ? nativeTokens.color.inkInverse : nativeTokens.color.ink}
              />
              {unread > 0 ? (
                <View style={feedStyles.unreadDot}>
                  <Text style={feedStyles.unreadText}>{unread > 99 ? "99+" : String(unread)}</Text>
                </View>
              ) : null}
            </Pressable>
          }
          search={
            <Pressable
              onPress={() => router.push("/(app)/search")}
              accessibilityRole="button"
              accessibilityLabel={t("search.placeholder")}
              testID="feed-search-button"
              style={({ pressed }) => [feedStyles.searchEntry, pressed ? feedStyles.pressed : null]}
            >
              <Icon name="search" size={18} color={nativeTokens.color.inkMuted} />
              <Text numberOfLines={1} style={feedStyles.searchText}>
                {t("search.placeholder")}
              </Text>
            </Pressable>
          }
        />

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
          <StateMessage
            message={feedError}
            actionLabel={t("common.retry")}
            busy={loading}
            onAction={() => void load(null)}
            tone="error"
            style={feedStyles.errorBox}
          />
        ) : null}

        <FlatList
          data={posts}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => (
            <PostRow
              post={item}
              onChange={(next) =>
                setPosts((prev) => prev.map((x) => (x.id === next.id ? next : x)))
              }
            />
          )}
          ItemSeparatorComponent={() => <View style={feedStyles.separator} />}
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (!loading && hasMore && cursor) void load(cursor);
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void refreshFeed()}
              tintColor={nativeTokens.color.brand600}
              colors={[nativeTokens.color.brand600]}
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
              <StateMessage message={t("feed.empty")} role="text" />
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

function JobsEntry(): JSX.Element {
  const { t } = useTranslation();
  return (
    <Pressable
      onPress={() => router.push("/(app)/jobs")}
      accessibilityRole="link"
      accessibilityLabel={t("feed.jobsEntryTitle")}
      testID="jobs-entry-card"
      style={({ pressed }) => [pressed ? feedStyles.pressed : null, feedStyles.jobsEntryWrap]}
    >
      <Surface variant="tinted" padding="4" style={feedStyles.jobsEntry}>
        <View style={feedStyles.jobsIcon}>
          <Icon name="briefcase" size={20} color={nativeTokens.color.brand700} />
        </View>
        <View style={feedStyles.jobsText}>
          <Text selectable style={feedStyles.jobsTitle}>
            {t("feed.jobsEntryTitle")}
          </Text>
          <Text selectable style={feedStyles.jobsSubtitle} numberOfLines={2}>
            {t("feed.jobsEntrySubtitle")}
          </Text>
        </View>
        <Button variant="secondary" size="sm" onPress={() => router.push("/(app)/jobs")}>
          {t("feed.jobsEntryAction")}
        </Button>
      </Surface>
    </Pressable>
  );
}

function ProfileSummary({ profile }: { profile: Profile }): JSX.Element {
  const { t } = useTranslation();
  const name = `${profile.firstName} ${profile.lastName}`.trim();
  const completed = [
    Boolean(profile.avatarUrl),
    Boolean(profile.headline),
    Boolean(profile.location),
    profile.experiences.length > 0 || profile.educations.length > 0,
    profile.skills.length > 0,
  ].filter(Boolean).length;

  return (
    <Surface variant="card" padding="4" style={feedStyles.profileCard}>
      <View style={feedStyles.profileMain}>
        <Avatar
          size="lg"
          user={{
            id: profile.userId,
            handle: profile.handle,
            firstName: profile.firstName,
            lastName: profile.lastName,
            avatarUrl: profile.avatarUrl,
          }}
        />
        <View style={feedStyles.profileText}>
          <Text selectable style={feedStyles.profileName}>
            {name}
          </Text>
          {profile.headline ? (
            <Text selectable style={feedStyles.profileHeadline} numberOfLines={2}>
              {profile.headline}
            </Text>
          ) : null}
          {profile.location ? (
            <Text selectable style={feedStyles.profileMeta}>
              {profile.location}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={feedStyles.profileFooter}>
        <Text selectable style={feedStyles.profileProgress}>
          {t("feed.profileCompletion", { completed, total: 5 })}
        </Text>
        <Button
          variant="secondary"
          size="sm"
          accessibilityLabel={t("feed.editProfile")}
          onPress={() => router.push("/(app)/me/edit")}
        >
          {t("feed.editProfile")}
        </Button>
      </View>
    </Surface>
  );
}

const feedStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: nativeTokens.color.surfaceMuted,
  },
  content: {
    flex: 1,
    paddingHorizontal: nativeTokens.space[4],
    paddingTop: nativeTokens.space[3],
  },
  iconButton: {
    width: nativeTokens.chrome.minHit,
    height: nativeTokens.chrome.minHit,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: nativeTokens.radius.full,
    backgroundColor: nativeTokens.color.surface,
    borderWidth: 1,
    borderColor: nativeTokens.color.lineSoft,
  },
  iconButtonActive: {
    backgroundColor: nativeTokens.color.accent600,
    borderColor: nativeTokens.color.accent600,
  },
  unreadDot: {
    position: "absolute",
    top: -nativeTokens.space[1],
    end: -nativeTokens.space[1],
    minWidth: nativeTokens.space[5],
    height: nativeTokens.space[5],
    borderRadius: nativeTokens.radius.full,
    backgroundColor: nativeTokens.color.accent700,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: nativeTokens.space[1],
  },
  unreadText: {
    color: nativeTokens.color.inkInverse,
    fontSize: nativeTokens.type.scale.caption.size,
    fontWeight: "700",
    fontFamily: nativeTokens.type.family.sans,
  },
  searchEntry: {
    minHeight: nativeTokens.chrome.minHit,
    borderRadius: nativeTokens.radius.full,
    borderWidth: 1,
    borderColor: nativeTokens.color.lineSoft,
    backgroundColor: nativeTokens.color.surface,
    paddingHorizontal: nativeTokens.space[3],
    flexDirection: "row",
    alignItems: "center",
    gap: nativeTokens.space[2],
  },
  searchText: {
    flex: 1,
    color: nativeTokens.color.inkMuted,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.body.size,
    textAlign: "right",
  },
  pressed: { opacity: 0.88 },
  composerWrap: { marginBottom: nativeTokens.space[3] },
  jobsEntryWrap: {
    marginBottom: nativeTokens.space[3],
  },
  jobsEntry: {
    flexDirection: "row",
    alignItems: "center",
    gap: nativeTokens.space[3],
  },
  jobsIcon: {
    width: nativeTokens.space[10],
    height: nativeTokens.space[10],
    borderRadius: nativeTokens.radius.full,
    backgroundColor: nativeTokens.color.brand100,
    alignItems: "center",
    justifyContent: "center",
  },
  jobsText: {
    flex: 1,
    minWidth: 0,
  },
  jobsTitle: {
    color: nativeTokens.color.ink,
    fontSize: nativeTokens.type.scale.h3.size,
    lineHeight: nativeTokens.type.scale.h3.line,
    fontWeight: "700",
    fontFamily: nativeTokens.type.family.sans,
    textAlign: "right",
  },
  jobsSubtitle: {
    color: nativeTokens.color.inkMuted,
    fontSize: nativeTokens.type.scale.small.size,
    lineHeight: nativeTokens.type.scale.small.line,
    fontFamily: nativeTokens.type.family.sans,
    textAlign: "right",
  },
  profileCard: {
    gap: nativeTokens.space[3],
    marginBottom: nativeTokens.space[3],
  },
  profileMain: {
    flexDirection: "row",
    alignItems: "center",
    gap: nativeTokens.space[3],
  },
  profileText: {
    flex: 1,
  },
  profileName: {
    color: nativeTokens.color.ink,
    fontSize: nativeTokens.type.scale.h2.size,
    lineHeight: nativeTokens.type.scale.h2.line,
    fontWeight: "700",
    fontFamily: nativeTokens.type.family.sans,
    textAlign: "right",
  },
  profileHeadline: {
    color: nativeTokens.color.inkMuted,
    fontSize: nativeTokens.type.scale.small.size,
    lineHeight: nativeTokens.type.scale.small.line,
    fontFamily: nativeTokens.type.family.sans,
    textAlign: "right",
  },
  profileMeta: {
    color: nativeTokens.color.inkSubtle,
    fontSize: nativeTokens.type.scale.caption.size,
    lineHeight: nativeTokens.type.scale.caption.line,
    fontFamily: nativeTokens.type.family.sans,
    textAlign: "right",
  },
  profileFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: nativeTokens.space[2],
  },
  profileProgress: {
    flex: 1,
    color: nativeTokens.color.brand700,
    fontSize: nativeTokens.type.scale.caption.size,
    lineHeight: nativeTokens.type.scale.caption.line,
    fontWeight: "700",
    fontFamily: nativeTokens.type.family.sans,
    textAlign: "right",
  },
  errorBox: {
    gap: nativeTokens.space[2],
    marginBottom: nativeTokens.space[3],
    backgroundColor: nativeTokens.color.warningSoft,
  },
  skeletonStack: {
    gap: nativeTokens.space[3],
  },
  separator: {
    height: nativeTokens.space[3],
  },
  footerLoading: {
    paddingVertical: nativeTokens.space[4],
  },
});
