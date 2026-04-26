import { Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { Surface } from "./Surface";
import { nativeTokens } from "./tokens";

export type LegalFooterLink = {
  href: string;
  label: string;
};

export interface LegalFooterProps {
  links: LegalFooterLink[];
  copyright: string;
  label?: string;
}

export function LegalFooter({ links, copyright, label = "روابط قانونية" }: LegalFooterProps) {
  return (
    <Surface variant="flat" padding="4" accessibilityRole="summary" accessibilityLabel={label}>
      <View style={styles.links}>
        {links.map((link) => (
          <Pressable
            key={link.href}
            accessibilityRole="link"
            accessibilityLabel={link.label}
            onPress={() => {
              void Linking.openURL(link.href);
            }}
            hitSlop={8}
          >
            <Text style={styles.link}>{link.label}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.copy}>{copyright}</Text>
    </Surface>
  );
}

const styles = StyleSheet.create({
  links: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: nativeTokens.space[4],
  },
  // Token shape lives at `nativeTokens.type.scale.<step>` — see
  // `packages/ui-tokens/src/tokens.native.ts`. There is no `font` namespace.
  link: {
    color: nativeTokens.color.inkMuted,
    fontSize: nativeTokens.type.scale.small.size,
    fontWeight: "600",
  },
  copy: {
    color: nativeTokens.color.inkMuted,
    fontSize: nativeTokens.type.scale.small.size,
    marginTop: nativeTokens.space[3],
  },
});
