// RecommendationCard — native twin of packages/ui-web/src/RecommendationCard.tsx.
//
// Same prop vocabulary: author / name / headline / relationship / date / body /
// badge / hidden / onOpenAuthor / onToggleHidden / labels. Native has no
// `className`.
//
// Same absence on both platforms: there is no `onEdit`. A testimonial the
// subject can rewrite is not a testimonial.

import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Avatar, type AvatarUser } from "./Avatar";
import { Surface } from "./Surface";
import { useThemeTokens } from "./ThemeProvider";
import { nativeTokens } from "./tokens";

export interface RecommendationCardLabels {
  hide: string;
  show: string;
}

export interface RecommendationCardProps {
  author: AvatarUser;
  name: string;
  headline?: string | null;
  /** How they knew you, already localised: «كان مديري المباشر». */
  relationship: string;
  /** Already formatted, e.g. «قبل ٣ أشهر». */
  date?: string | null;
  body: string;
  badge?: ReactNode;
  hidden?: boolean;
  onOpenAuthor?: () => void;
  /** Present only for the subject. Its absence is what makes this read-only. */
  onToggleHidden?: () => void;
  labels: RecommendationCardLabels;
}

export function RecommendationCard({
  author,
  name,
  headline,
  relationship,
  date,
  body,
  badge,
  hidden = false,
  onOpenAuthor,
  onToggleHidden,
  labels,
}: RecommendationCardProps): JSX.Element {
  const c = useThemeTokens().color;

  return (
    // A hidden testimonial stays legible rather than greyed to unreadable: the
    // subject has to be able to read what they are hiding.
    <Surface variant="card" padding="4" style={[styles.card, hidden ? styles.hidden : null]}>
      <View style={styles.head}>
        <Avatar user={author} size="md" />

        <View style={styles.headBody}>
          <View style={styles.nameRow}>
            <Pressable onPress={onOpenAuthor} disabled={!onOpenAuthor} style={styles.nameHit}>
              <Text numberOfLines={1} style={[styles.name, { color: c.ink }]}>
                {name}
              </Text>
            </Pressable>
            {badge}
          </View>
          {headline ? (
            <Text numberOfLines={1} style={[styles.meta, { color: c.inkMuted }]}>
              {headline}
            </Text>
          ) : null}
          <Text style={[styles.micro, { color: c.inkSubtle }]}>
            {date ? `${relationship} · ${date}` : relationship}
          </Text>
        </View>

        {onToggleHidden ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? labels.show : labels.hide}
            onPress={onToggleHidden}
            style={styles.toggle}
          >
            <Text style={[styles.meta, { color: c.inkMuted }]}>
              {hidden ? labels.show : labels.hide}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <Text style={[styles.body, { color: c.ink }]}>{body}</Text>
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: { gap: nativeTokens.space[3] },
  hidden: { opacity: 0.7 },
  head: { flexDirection: "row", alignItems: "flex-start", gap: nativeTokens.space[3] },
  headBody: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: nativeTokens.space[2] },
  // 44pt minimum hit target — MOBILE.md, non-negotiable.
  nameHit: { flexShrink: 1, minHeight: 44, justifyContent: "center" },
  name: {
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.body.size,
    fontWeight: "600",
  },
  meta: {
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.small.size,
  },
  micro: {
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.micro.size,
  },
  toggle: { minHeight: 44, minWidth: 44, justifyContent: "center", alignItems: "center" },
  body: {
    fontFamily: nativeTokens.type.family.body,
    fontSize: nativeTokens.type.scale.body.size,
    lineHeight: nativeTokens.type.scale.body.size * nativeTokens.type.scale.body.line,
  },
});
