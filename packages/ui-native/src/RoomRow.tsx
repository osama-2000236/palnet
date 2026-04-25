import { Pressable, StyleSheet, Text, View } from "react-native";

import { Avatar, type AvatarUser } from "./Avatar";
import { nativeTokens } from "./tokens";

export interface RoomRowProps {
  user: AvatarUser;
  preview: string;
  timestamp: string;
  unreadCount?: number;
  online?: boolean;
  active?: boolean;
  onClick(): void;
  ariaLabel?: string;
}

export function RoomRow({
  user,
  preview,
  timestamp,
  unreadCount = 0,
  online = false,
  active = false,
  onClick,
  ariaLabel,
}: RoomRowProps): JSX.Element {
  const name = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.handle || "";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={ariaLabel ?? name}
      accessibilityState={{ selected: active }}
      onPress={onClick}
      style={[styles.root, active ? styles.active : null]}
    >
      <Avatar user={user} size="md" online={online} />
      <View style={styles.body}>
        <View style={styles.top}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          <Text style={styles.time}>{timestamp}</Text>
        </View>
        <View style={styles.top}>
          <Text style={[styles.preview, unreadCount > 0 ? styles.unread : null]} numberOfLines={1}>
            {preview}
          </Text>
          {unreadCount > 0 ? (
            <Text style={styles.badge}>{unreadCount > 99 ? "99+" : unreadCount}</Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: "row",
    alignItems: "center",
    gap: nativeTokens.space[3],
    padding: nativeTokens.space[4],
    borderBottomWidth: 1,
    borderBottomColor: nativeTokens.color.lineSoft,
    borderStartWidth: 3,
    borderStartColor: "transparent",
  },
  active: {
    backgroundColor: nativeTokens.color.brand50,
    borderStartColor: nativeTokens.color.brand600,
  },
  body: { flex: 1, gap: nativeTokens.space[1] },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: nativeTokens.space[2] },
  name: { flex: 1, color: nativeTokens.color.ink, fontFamily: nativeTokens.type.family.sans, fontWeight: "700" },
  time: { color: nativeTokens.color.inkMuted, fontSize: nativeTokens.type.scale.small.size },
  preview: { flex: 1, color: nativeTokens.color.inkMuted, fontSize: nativeTokens.type.scale.small.size },
  unread: { color: nativeTokens.color.ink, fontWeight: "700" },
  badge: {
    minWidth: 20,
    borderRadius: 10,
    overflow: "hidden",
    textAlign: "center",
    paddingHorizontal: nativeTokens.space[1],
    color: nativeTokens.color.inkInverse,
    backgroundColor: nativeTokens.color.accent600,
    fontSize: nativeTokens.type.scale.small.size,
    fontWeight: "700",
  },
});
