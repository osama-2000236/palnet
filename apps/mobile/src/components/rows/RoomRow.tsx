import { type ChatRoom } from "@baydar/shared";
import { Avatar, Surface, nativeTokens } from "@baydar/ui-native";
import { router } from "expo-router";
import { memo } from "react";
import { I18nManager, Pressable, StyleSheet, Text, View } from "react-native";
import { Swipeable } from "react-native-gesture-handler";

export interface RoomRowProps {
  room: ChatRoom;
  viewerId: string | null;
  archiveLabel: string;
  onArchive: (roomId: string) => void;
}

export const RoomRow = memo(function RoomRow({
  room,
  viewerId,
  archiveLabel,
  onArchive,
}: RoomRowProps): JSX.Element {
  const other = viewerId ? room.members.find((m) => m.userId !== viewerId) : null;
  const label = other
    ? `${other.firstName} ${other.lastName}`.trim() || other.handle
    : (room.title ?? room.id);
  const avatarUser = other
    ? {
        id: other.userId,
        handle: other.handle,
        firstName: other.firstName,
        lastName: other.lastName,
        avatarUrl: other.avatarUrl ?? null,
      }
    : null;

  const archiveAction = (): JSX.Element => (
    <Pressable
      onPress={() => onArchive(room.id)}
      accessibilityRole="button"
      accessibilityLabel={archiveLabel}
      style={styles.archiveAction}
    >
      <Text style={styles.archiveText}>{archiveLabel}</Text>
    </Pressable>
  );

  return (
    <Swipeable
      overshootLeft={false}
      overshootRight={false}
      renderLeftActions={!I18nManager.isRTL ? archiveAction : undefined}
      renderRightActions={I18nManager.isRTL ? archiveAction : undefined}
    >
      <Pressable
        onPress={() =>
          router.push({
            pathname: "/(app)/messages/[roomId]",
            params: { roomId: room.id },
          })
        }
        accessibilityRole="link"
        accessibilityLabel={label}
        testID={`room-row-${room.id}`}
      >
        <Surface variant="card" padding="3">
          <View style={styles.row}>
            <Avatar user={avatarUser} size="md" />

            <View style={styles.textWrap}>
              <Text numberOfLines={1} style={styles.title}>
                {label}
              </Text>
              {room.lastMessage ? (
                <Text numberOfLines={1} style={styles.preview}>
                  {room.lastMessage.body}
                </Text>
              ) : null}
            </View>

            {room.unreadCount > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{room.unreadCount}</Text>
              </View>
            ) : null}
          </View>
        </Surface>
      </Pressable>
    </Swipeable>
  );
}, areEqual);

function areEqual(prev: RoomRowProps, next: RoomRowProps): boolean {
  return (
    prev.room.id === next.room.id &&
    prev.room.updatedAt === next.room.updatedAt &&
    prev.room.unreadCount === next.room.unreadCount &&
    prev.viewerId === next.viewerId &&
    prev.archiveLabel === next.archiveLabel
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: nativeTokens.space[3],
  },
  textWrap: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: nativeTokens.color.ink,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.h3.size,
    lineHeight: nativeTokens.type.scale.h3.line,
    fontWeight: "600",
  },
  preview: {
    color: nativeTokens.color.inkMuted,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.small.size,
  },
  badge: {
    marginStart: nativeTokens.space[2],
    minWidth: nativeTokens.space[6],
    height: nativeTokens.space[6],
    paddingHorizontal: nativeTokens.space[2],
    borderRadius: nativeTokens.radius.full,
    backgroundColor: nativeTokens.color.accent600,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: nativeTokens.color.inkInverse,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.caption.size,
    fontWeight: "700",
  },
  archiveAction: {
    minWidth: nativeTokens.space[20],
    borderRadius: nativeTokens.radius.md,
    backgroundColor: nativeTokens.color.danger,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: nativeTokens.space[3],
  },
  archiveText: {
    color: nativeTokens.color.inkInverse,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.small.size,
    fontWeight: "700",
  },
});
