import { profileCompletion, formatNumber, type Profile } from "@baydar/shared";
import { AppBand, Avatar, Button, Icon, Surface, useThemeTokens } from "@baydar/ui-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Pressable, Text, View } from "react-native";

import { useFeedStyles } from "./styles";

export function FeedTopBar({
  unread,
  roundCount,
}: {
  unread: number;
  /** Posts in today's round. The round is finite and says so. */
  roundCount: number;
}): JSX.Element {
  const { t, i18n } = useTranslation();
  const feedStyles = useFeedStyles();
  const c = useThemeTokens().color;

  return (
    <AppBand
      density="compact"
      title={t("common.appName")}
      subtitle={
        roundCount > 0 ? t("feed.round.count", { count: roundCount }) : t("feed.round.label")
      }
      trailing={
        <Pressable
          onPress={() => router.push("/(app)/notifications")}
          accessibilityRole="button"
          accessibilityLabel={
            unread > 0 ? t("nav.unreadNotifications", { count: unread }) : t("notifications.title")
          }
          testID="feed-notifications-button"
          style={({ pressed }) => [
            feedStyles.iconButton,
            unread > 0 ? feedStyles.iconButtonActive : null,
            pressed ? feedStyles.pressed : null,
          ]}
        >
          <Icon name="bell" size={20} color={unread > 0 ? c.inkInverse : c.ink} />
          {unread > 0 ? (
            <View style={feedStyles.unreadDot}>
              <Text style={feedStyles.unreadText}>
                {unread > 99
                  ? `${formatNumber(99, i18n.language)}+`
                  : formatNumber(unread, i18n.language)}
              </Text>
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
          <Icon name="search" size={18} color={c.inkMuted} />
          <Text numberOfLines={1} style={feedStyles.searchText}>
            {t("search.placeholder")}
          </Text>
        </Pressable>
      }
    />
  );
}

export function JobsEntry(): JSX.Element {
  const { t } = useTranslation();
  const feedStyles = useFeedStyles();
  const c = useThemeTokens().color;
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
          <Icon name="briefcase" size={20} color={c.brand700} />
        </View>
        <View style={feedStyles.jobsText}>
          <Text selectable style={feedStyles.jobsTitle}>
            {t("feed.jobsEntryTitle")}
          </Text>
          <Text selectable style={feedStyles.jobsSubtitle} numberOfLines={2}>
            {t("feed.jobsEntrySubtitle")}
          </Text>
        </View>
      </Surface>
    </Pressable>
  );
}

export function ProfileSummary({ profile }: { profile: Profile }): JSX.Element {
  const { t } = useTranslation();
  const feedStyles = useFeedStyles();
  const name = `${profile.firstName} ${profile.lastName}`.trim();
  const { completed, total } = profileCompletion(profile);

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
          {t("feed.profileCompletion", { completed, total })}
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
