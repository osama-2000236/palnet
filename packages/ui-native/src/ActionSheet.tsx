// ActionSheet — the native counterpart to packages/ui-web/src/Menu.tsx.
//
// Same prop vocabulary (`items` of {id, label, icon, description, destructive,
// disabled, onSelect}), different container: a menu anchored to a trigger is a
// pointer pattern, a sheet from the bottom edge is the touch one. That is the
// split PARITY.md already records for Dialog ↔ Sheet, applied again rather than
// invented — so the same host code describes the same actions on both
// platforms and only the shell differs.
//
// Composition over reimplementation: this is `Sheet` plus a row list, so the
// drag-to-dismiss, backdrop, safe-area and reduced-motion behaviour all come
// from the one implementation that already has them.

import { Pressable, StyleSheet, Text, View } from "react-native";

import { Icon, type IconName } from "./Icon";
import { Sheet } from "./Sheet";
import { useThemeTokens } from "./ThemeProvider";
import { nativeTokens } from "./tokens";

export interface ActionSheetItem {
  id: string;
  label: string;
  icon?: IconName;
  description?: string;
  destructive?: boolean;
  disabled?: boolean;
  onSelect(): void;
}

export interface ActionSheetProps {
  open: boolean;
  onClose(): void;
  /** Accessible name of the sheet, and its visible title when given. */
  label: string;
  items: ActionSheetItem[];
  closeLabel?: string;
}

export function ActionSheet({
  open,
  onClose,
  label,
  items,
  closeLabel,
}: ActionSheetProps): JSX.Element {
  const c = useThemeTokens().color;
  return (
    <Sheet open={open} onClose={onClose} title={label} closeLabel={closeLabel} scroll={false}>
      <View>
        {items.map((item) => (
          <Pressable
            key={item.id}
            disabled={item.disabled}
            accessibilityRole="button"
            accessibilityLabel={item.label}
            accessibilityHint={item.description}
            accessibilityState={{ disabled: Boolean(item.disabled) }}
            onPress={() => {
              onClose();
              item.onSelect();
            }}
            style={({ pressed }) => [
              styles.row,
              { backgroundColor: pressed ? c.surfaceSubtle : "transparent" },
              item.disabled ? styles.disabled : null,
            ]}
          >
            {item.icon ? (
              <Icon name={item.icon} size={20} color={item.destructive ? c.danger : c.inkMuted} />
            ) : null}
            <View style={styles.text}>
              <Text style={[styles.label, { color: item.destructive ? c.danger : c.ink }]}>
                {item.label}
              </Text>
              {item.description ? (
                <Text style={[styles.description, { color: c.inkMuted }]}>{item.description}</Text>
              ) : null}
            </View>
          </Pressable>
        ))}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: nativeTokens.space[3],
    // The whole row is the target, so it clears 44pt without a hitSlop.
    minHeight: nativeTokens.target.min,
    paddingVertical: nativeTokens.space[3],
    paddingHorizontal: nativeTokens.space[1],
    borderRadius: nativeTokens.radius.md,
  },
  disabled: { opacity: 0.55 },
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
