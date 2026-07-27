// SwitchRow — native twin of packages/ui-web/src/SwitchRow.tsx. Same props
// (checked / onChange / label / description / disabled); the whole row is the
// target, which on touch matters more than it does with a pointer.

import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Switch } from "./Switch";
import { useThemeTokens } from "./ThemeProvider";
import { nativeTokens } from "./tokens";

export interface SwitchRowProps {
  checked: boolean;
  onChange(value: boolean): void;
  label: string;
  description?: ReactNode;
  disabled?: boolean;
}

export function SwitchRow({
  checked,
  onChange,
  label,
  description,
  disabled = false,
}: SwitchRowProps): JSX.Element {
  const c = useThemeTokens().color;
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityHint={typeof description === "string" ? description : undefined}
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      onPress={() => onChange(!checked)}
      style={[styles.row, disabled ? styles.disabled : null]}
    >
      <View style={styles.text}>
        <Text style={[styles.label, { color: c.ink }]}>{label}</Text>
        {description ? (
          <Text style={[styles.description, { color: c.inkMuted }]}>{description}</Text>
        ) : null}
      </View>
      {/* The row owns the gesture and already announces the switch role, so the
          control itself is decorative to the accessibility tree — otherwise a
          screen-reader user hears the same setting twice. */}
      <View importantForAccessibility="no-hide-descendants" pointerEvents="none">
        <Switch checked={checked} onChange={onChange} ariaLabel={label} disabled={disabled} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: nativeTokens.space[4],
    minHeight: nativeTokens.target.min,
    paddingVertical: nativeTokens.space[3],
  },
  disabled: { opacity: 0.6 },
  text: { flex: 1, minWidth: 0 },
  label: {
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.body.size,
    lineHeight: nativeTokens.type.scale.body.line,
    fontWeight: "500",
  },
  description: {
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.caption.size,
    lineHeight: nativeTokens.type.scale.caption.line,
    marginTop: 2,
  },
});
