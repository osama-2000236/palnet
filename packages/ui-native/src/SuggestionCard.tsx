// SuggestionCard - native twin of packages/ui-web/src/SuggestionCard.tsx.
//
// Same prop vocabulary: user / name / headline / reason / actions / degree /
// onOpen / onDismiss / labels. Native has no `className`.
//
// `reason` is required on both platforms: a candidate the product cannot
// explain is a candidate it does not show.

import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Avatar, type AvatarUser } from "./Avatar";
import { Icon } from "./Icon";
import { Surface } from "./Surface";
import { useThemeTokens } from "./ThemeProvider";
import { nativeTokens } from "./tokens";

export interface SuggestionCardLabels {
  /** «لا تقترح هذا الشخص» — the dismiss control's spoken name. */
  dismiss: string;
}

export interface SuggestionCardProps {
  user: AvatarUser;
  name: string;
  headline?: string | null;
  /** Already-formatted, e.g. «٤ معارف مشتركين» or «خرّيجو جامعة النجاح». */
  reason: string;
  actions?: ReactNode;
  degree?: ReactNode;
  onOpen?: () => void;
  onDismiss?: () => void;
  labels: SuggestionCardLabels;
}

export function SuggestionCard({
  user,
  name,
  headline,
  reason,
  actions,
  degree,
  onOpen,
  onDismiss,
  labels,
}: SuggestionCardProps): JSX.Element {
  const c = useThemeTokens().color;

  return (
    <Surface variant="row" padding="4" style={styles.card}>
      <Avatar user={user} size="md" />

      <View style={styles.body}>
        <View style={styles.nameRow}>
          <Pressable onPress={onOpen} disabled={!onOpen} style={styles.nameHit}>
            <Text numberOfLines={1} style={[styles.name, { color: c.ink }]}>
              {name}
            </Text>
          </Pressable>
          {degree}
        </View>
        {headline ? (
          <Text numberOfLines={1} style={[styles.meta, { color: c.inkMuted }]}>
            {headline}
          </Text>
        ) : null}
        {/* The reason, always. This is the line that justifies the card. */}
        <Text style={[styles.meta, { color: c.inkSubtle }]}>{reason}</Text>
        {actions ? <View style={styles.actions}>{actions}</View> : null}
      </View>

      {onDismiss ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={labels.dismiss}
          onPress={onDismiss}
          hitSlop={8}
          style={styles.dismiss}
        >
          <Icon name="x" size={16} color={c.inkSubtle} />
        </Pressable>
      ) : null}
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "flex-start", gap: nativeTokens.space[3] },
  body: { flex: 1, gap: nativeTokens.space[1] },
  nameRow: { flexDirection: "row", alignItems: "center", gap: nativeTokens.space[2] },
  nameHit: { flexShrink: 1 },
  name: {
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.h3.size,
    fontWeight: "600",
  },
  meta: {
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.small.size,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: nativeTokens.space[2],
    marginTop: nativeTokens.space[2],
  },
  dismiss: { padding: nativeTokens.space[1] },
});
