// MutualsRow - native twin of packages/ui-web/src/MutualsRow.tsx.
//
// Same prop vocabulary: count / sample / label. Native has no `className`.
// Renders nothing at zero on both platforms — "0 mutual connections" makes a
// stranger feel further away, which is the opposite of the point.

import { StyleSheet, Text, View } from "react-native";

import { Avatar, type AvatarUser } from "./Avatar";
import { useThemeTokens } from "./ThemeProvider";
import { nativeTokens } from "./tokens";

export interface MutualsRowProps {
  count: number;
  /** At most three. More are ignored rather than rendered small. */
  sample: AvatarUser[];
  /** Pre-formatted by the host, in the reader's digits. */
  label: string;
}

export function MutualsRow({ count, sample, label }: MutualsRowProps): JSX.Element | null {
  const c = useThemeTokens().color;
  if (count === 0) return null;

  return (
    <View style={styles.row}>
      {sample.length > 0 ? (
        // Marked decorative: the names are already in the label, and reading
        // three of them again is noise on a screen reader.
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={styles.faces}
        >
          {sample.slice(0, 3).map((person, index) => (
            <View key={person.id} style={index === 0 ? undefined : styles.overlap}>
              <Avatar user={person} size="xs" />
            </View>
          ))}
        </View>
      ) : null}
      <Text style={[styles.label, { color: c.inkMuted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: nativeTokens.space[2] },
  faces: { flexDirection: "row" },
  overlap: { marginStart: -nativeTokens.space[2] },
  label: {
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.small.size,
  },
});
