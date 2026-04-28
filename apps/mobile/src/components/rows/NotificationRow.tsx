import { formatRelativeTime, NotificationType, type Notification } from "@baydar/shared";
import { Avatar, Icon, Surface, nativeTokens } from "@baydar/ui-native";
import { router } from "expo-router";
import { memo } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";

export const NotificationRow = memo(function NotificationRow({
  item,
}: {
  item: Notification;
}): JSX.Element {
  const { t, i18n } = useTranslation();
  const actor = item.actor;
  const actorName = actor ? `${actor.firstName} ${actor.lastName}`.trim() || actor.handle : "";
  const body = t(`notifications.templates.${item.type}`, { actor: actorName });
  const unread = item.readAt === null;
  const destination = hrefFor(item);

  const content = (
    <Surface variant="row" padding="4" style={unread ? styles.unreadRow : styles.row}>
      {actor ? (
        <Avatar
          user={{
            id: actor.id,
            handle: actor.handle,
            firstName: actor.firstName,
            lastName: actor.lastName,
            avatarUrl: actor.avatarUrl,
          }}
          size="md"
        />
      ) : (
        <View style={styles.systemIcon}>
          <Icon name="bell" size={nativeTokens.space[5]} color={nativeTokens.color.brand700} />
        </View>
      )}
      <View style={styles.bodyWrap}>
        <Text style={styles.bodyText}>{body}</Text>
        <Text style={styles.timeText}>{formatRelativeTime(item.createdAt, i18n.language)}</Text>
      </View>
      {unread ? <View style={styles.unreadDot} /> : null}
    </Surface>
  );

  if (!destination) return content;
  return (
    <Pressable
      onPress={() => router.push(destination as never)}
      accessibilityRole="link"
      accessibilityLabel={body}
    >
      {content}
    </Pressable>
  );
}, areEqual);

function areEqual(prev: { item: Notification }, next: { item: Notification }): boolean {
  return prev.item.id === next.item.id && prev.item.readAt === next.item.readAt;
}

function hrefFor(n: Notification): string | null {
  if (n.type === NotificationType.MESSAGE_RECEIVED) {
    const data = n.data as { roomId?: string } | null;
    if (data?.roomId) return `/(app)/messages/${data.roomId}`;
    return "/(app)/messages";
  }
  if (
    n.type === NotificationType.CONNECTION_REQUEST ||
    n.type === NotificationType.CONNECTION_ACCEPTED
  ) {
    return "/(app)/network";
  }
  if (
    n.type === NotificationType.POST_REACTION ||
    n.type === NotificationType.POST_COMMENT ||
    n.type === NotificationType.POST_MENTION
  ) {
    return "/(app)/feed";
  }
  if (n.type === NotificationType.PROFILE_VIEW && n.actor?.handle) {
    return `/(app)/in/${n.actor.handle}`;
  }
  return null;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: nativeTokens.space[3],
  },
  unreadRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: nativeTokens.space[3],
    backgroundColor: nativeTokens.color.brand50,
  },
  bodyWrap: {
    flex: 1,
    gap: nativeTokens.space[1],
  },
  bodyText: {
    color: nativeTokens.color.ink,
    fontSize: nativeTokens.type.scale.small.size,
    lineHeight: nativeTokens.type.scale.small.line,
    fontFamily: nativeTokens.type.family.sans,
  },
  timeText: {
    color: nativeTokens.color.inkMuted,
    fontSize: nativeTokens.type.scale.caption.size,
    lineHeight: nativeTokens.type.scale.caption.line,
    fontFamily: nativeTokens.type.family.sans,
  },
  unreadDot: {
    width: nativeTokens.space[2],
    height: nativeTokens.space[2],
    borderRadius: nativeTokens.radius.full,
    backgroundColor: nativeTokens.color.accent600,
    marginTop: nativeTokens.space[1],
  },
  systemIcon: {
    width: nativeTokens.space[10],
    height: nativeTokens.space[10],
    borderRadius: nativeTokens.radius.full,
    backgroundColor: nativeTokens.color.brand100,
    alignItems: "center",
    justifyContent: "center",
  },
});
