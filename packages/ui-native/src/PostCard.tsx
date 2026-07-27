import { useMemo } from "react";
import { Pressable, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { Avatar } from "./Avatar";
import { Icon, type IconName } from "./Icon";
import { makeStyles } from "./PostCard.styles";
import type { PostCardProps } from "./PostCard.types";
import { ReactionGlyph } from "./ReactionGlyph";
import { Surface } from "./Surface";
import { useThemeTokens } from "./ThemeProvider";

export type { PostCardAction, PostCardProps } from "./PostCard.types";

export function PostCard({
  author,
  authorName,
  authorHeadline,
  timestamp,
  body,
  media,
  reactionCount,
  reactionKinds,
  commentCount,
  repostCount,
  actions,
  comments,
  onAuthorPress,
  authorAccessibilityLabel,
  onMorePress,
  moreAccessibilityLabel,
  style,
  testID,
}: PostCardProps): JSX.Element {
  const c = useThemeTokens().color;
  const styles = useMemo(() => makeStyles(c), [c]);
  // Was `> 3`, mirroring web's "hide the labels below `sm`". Web re-measured
  // that rule at 390px in Arabic with the four actions that remain after
  // share/send was deleted: the row wants 308px of 340px available and nothing
  // clips, so web shows the labels again — and a bare-icon row on the platform
  // where icons are *smaller* was the wrong half of the parity to keep.
  // Five would still overflow, so the threshold moves rather than disappears.
  const iconOnly = actions.length > 4;
  const stat = (icon: IconName, value: number | string | undefined, wrap: StyleProp<ViewStyle>) =>
    value === undefined ? null : (
      <View style={wrap}>
        <Icon name={icon} size={12} color={icon === "thumb" ? c.brand700 : c.inkMuted} />
        <Text selectable style={styles.statText}>
          {value}
        </Text>
      </View>
    );
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
      {/* Nested inside the author Pressable: RN's responder system gives the
          inner Pressable the touch, so this never opens the profile. Rendered
          only when the host wires it — a glyph that does nothing is worse
          than no glyph. Mirrors web's header `more` → onReport. */}
      {onMorePress ? (
        <Pressable
          onPress={onMorePress}
          accessibilityRole="button"
          accessibilityLabel={moreAccessibilityLabel}
          hitSlop={8}
          style={({ pressed }) => [styles.moreWrap, pressed ? styles.pressed : null]}
        >
          <Icon name="more" size={18} color={c.inkMuted} />
        </Pressable>
      ) : null}
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

      {/* Callers pass undefined for zero counts so an untouched post shows no
          "0 ⇄ 0" noise; the row hides entirely when every stat is empty. */}
      {reactionCount !== undefined || commentCount !== undefined || repostCount !== undefined ? (
        <View style={styles.stats}>
          {reactionCount === undefined ? null : (
            <View style={styles.reactionPill}>
              {(reactionKinds && reactionKinds.length > 0
                ? reactionKinds
                : (["LIKE"] as const)
              ).map((kind) => (
                <ReactionGlyph key={kind} kind={kind} size={12} tinted strokeWidth={2.2} />
              ))}
              <Text selectable style={styles.statText}>
                {reactionCount}
              </Text>
            </View>
          )}
          <View style={styles.statEnd}>
            {stat("comment", commentCount, styles.statItem)}
            {stat("repost", repostCount, styles.statItem)}
          </View>
        </View>
      ) : null}

      <View style={styles.actionBar}>
        {actions.map((action) => (
          <Pressable
            key={action.key}
            onPress={action.onPress}
            onLongPress={action.onLongPress}
            disabled={action.disabled}
            accessibilityRole="button"
            accessibilityLabel={action.accessibilityLabel ?? action.label}
            accessibilityHint={action.accessibilityHint}
            accessibilityState={{ selected: action.selected, disabled: action.disabled }}
            testID={action.testID}
            style={({ pressed }) => [
              styles.action,
              action.selected ? styles.actionSelected : null,
              pressed && !action.disabled ? styles.pressed : null,
              action.disabled ? styles.disabled : null,
            ]}
          >
            {action.glyph ?? (
              <Icon
                name={action.icon}
                size={iconOnly ? 20 : 16}
                color={action.selected ? c.brand700 : c.inkMuted}
              />
            )}
            {iconOnly ? null : (
              <Text
                numberOfLines={1}
                style={[styles.actionLabel, action.selected ? styles.actionLabelSelected : null]}
              >
                {action.label}
              </Text>
            )}
          </Pressable>
        ))}
      </View>

      {comments ? <View style={styles.comments}>{comments}</View> : null}
    </Surface>
  );
}
