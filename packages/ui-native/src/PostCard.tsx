import { useMemo, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { Avatar, type AvatarUser } from "./Avatar";
import { Icon, type IconName } from "./Icon";
import { Surface } from "./Surface";
import { useThemeTokens } from "./ThemeProvider";
import { nativeTokens } from "./tokens";

export interface PostCardAction {
  key: string;
  label: string;
  icon: IconName;
  selected?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  testID?: string;
  onPress?: () => void;
}

export interface PostCardProps {
  author: AvatarUser;
  authorName: string;
  authorHeadline?: string | null;
  timestamp?: string | null;
  body: string;
  media?: ReactNode;
  reactionCount?: number;
  commentCount?: number;
  repostCount?: number;
  actions: PostCardAction[];
  comments?: ReactNode;
  onAuthorPress?: () => void;
  authorAccessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function PostCard({
  author,
  authorName,
  authorHeadline,
  timestamp,
  body,
  media,
  reactionCount = 0,
  commentCount = 0,
  repostCount = 0,
  actions,
  comments,
  onAuthorPress,
  authorAccessibilityLabel,
  style,
  testID,
}: PostCardProps): JSX.Element {
  const c = useThemeTokens().color;
  const styles = useMemo(() => makeStyles(c), [c]);
  const header = (
    <View style={styles.header}>
      <Avatar user={author} size="md" />
      <View style={styles.authorText}>
        <Text selectable numberOfLines={1} style={styles.authorName}>
          {authorName}
        </Text>
        {authorHeadline ? (
          <Text selectable numberOfLines={1} style={styles.authorMeta}>
            {authorHeadline}
          </Text>
        ) : null}
        {timestamp ? (
          <Text selectable numberOfLines={1} style={styles.timestamp}>
            {timestamp}
          </Text>
        ) : null}
      </View>
      <View style={styles.moreWrap}>
        <Icon name="more" size={18} color={c.inkMuted} />
      </View>
    </View>
  );

  return (
    <Surface variant="card" padding="0" style={[styles.card, style]} testID={testID}>
      {onAuthorPress ? (
        <Pressable
          onPress={onAuthorPress}
          accessibilityRole="link"
          accessibilityLabel={authorAccessibilityLabel ?? authorName}
          style={({ pressed }) => [styles.headerPressable, pressed ? styles.pressed : null]}
        >
          {header}
        </Pressable>
      ) : (
        <View style={styles.headerPressable}>{header}</View>
      )}

      <View style={styles.bodyWrap}>
        <Text selectable style={styles.body}>
          {body}
        </Text>
      </View>

      {media ? <View style={styles.media}>{media}</View> : null}

      <View style={styles.stats}>
        <View style={styles.reactionPill}>
          <Icon name="thumb" size={12} color={c.brand700} />
          <Text selectable style={styles.statText}>
            {reactionCount}
          </Text>
        </View>
        <View style={styles.statEnd}>
          <View style={styles.statItem}>
            <Icon name="comment" size={12} color={c.inkMuted} />
            <Text selectable style={styles.statText}>
              {commentCount}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Icon name="repost" size={12} color={c.inkMuted} />
            <Text selectable style={styles.statText}>
              {repostCount}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.actionBar}>
        {actions.map((action) => (
          <Pressable
            key={action.key}
            onPress={action.onPress}
            disabled={action.disabled}
            accessibilityRole="button"
            accessibilityLabel={action.accessibilityLabel ?? action.label}
            accessibilityState={{ selected: action.selected, disabled: action.disabled }}
            testID={action.testID}
            style={({ pressed }) => [
              styles.action,
              action.selected ? styles.actionSelected : null,
              pressed && !action.disabled ? styles.pressed : null,
              action.disabled ? styles.disabled : null,
            ]}
          >
            <Icon name={action.icon} size={16} color={action.selected ? c.brand700 : c.inkMuted} />
            <Text
              numberOfLines={1}
              style={[styles.actionLabel, action.selected ? styles.actionLabelSelected : null]}
            >
              {action.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {comments ? <View style={styles.comments}>{comments}</View> : null}
    </Surface>
  );
}

const makeStyles = (c: typeof nativeTokens.color) =>
  StyleSheet.create({
    card: {
      overflow: "hidden",
    },
    headerPressable: {
      paddingHorizontal: nativeTokens.space[4],
      paddingTop: nativeTokens.space[4],
      paddingBottom: nativeTokens.space[2],
    },
    header: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: nativeTokens.space[3],
    },
    authorText: {
      flex: 1,
      minWidth: 0,
    },
    authorName: {
      color: c.ink,
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.h3.size,
      lineHeight: nativeTokens.type.scale.h3.line,
      fontWeight: "700",
      textAlign: "right",
    },
    authorMeta: {
      color: c.inkMuted,
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.small.size,
      lineHeight: nativeTokens.type.scale.small.line,
      textAlign: "right",
    },
    timestamp: {
      color: c.inkSubtle,
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.caption.size,
      lineHeight: nativeTokens.type.scale.caption.line,
      textAlign: "right",
    },
    moreWrap: {
      minWidth: nativeTokens.space[8],
      minHeight: nativeTokens.space[8],
      alignItems: "center",
      justifyContent: "center",
    },
    bodyWrap: {
      paddingHorizontal: nativeTokens.space[4],
      paddingBottom: nativeTokens.space[3],
    },
    body: {
      color: c.ink,
      fontFamily: nativeTokens.type.family.body,
      fontSize: nativeTokens.type.scale.body.size,
      lineHeight: nativeTokens.type.scale.body.line,
      textAlign: "right",
    },
    media: {
      overflow: "hidden",
    },
    stats: {
      minHeight: nativeTokens.space[10],
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: nativeTokens.space[4],
      paddingVertical: nativeTokens.space[2],
    },
    reactionPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: nativeTokens.space[1],
      borderRadius: nativeTokens.radius.full,
      backgroundColor: c.brand50,
      paddingHorizontal: nativeTokens.space[2],
      paddingVertical: nativeTokens.space[1],
    },
    statEnd: {
      flexDirection: "row",
      alignItems: "center",
      gap: nativeTokens.space[3],
    },
    statItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: nativeTokens.space[1],
    },
    statText: {
      color: c.inkMuted,
      fontFamily: nativeTokens.type.family.mono,
      fontSize: nativeTokens.type.scale.caption.size,
      lineHeight: nativeTokens.type.scale.caption.line,
    },
    actionBar: {
      borderTopWidth: 1,
      borderTopColor: c.lineSoft,
      flexDirection: "row",
      padding: nativeTokens.space[1],
      gap: nativeTokens.space[1],
    },
    action: {
      flex: 1,
      minHeight: nativeTokens.chrome.minHit,
      borderRadius: nativeTokens.radius.md,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: nativeTokens.space[1],
      paddingHorizontal: nativeTokens.space[1],
    },
    actionSelected: {
      backgroundColor: c.brand50,
    },
    actionLabel: {
      color: c.inkMuted,
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.caption.size,
      fontWeight: "700",
    },
    actionLabelSelected: {
      color: c.brand700,
    },
    comments: {
      borderTopWidth: 1,
      borderTopColor: c.lineSoft,
      backgroundColor: c.surfaceSubtle,
      padding: nativeTokens.space[3],
    },
    pressed: {
      opacity: 0.88,
    },
    disabled: {
      opacity: 0.5,
    },
  });
