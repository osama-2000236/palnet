// Alert — native twin of packages/ui-web/src/Alert.tsx. Persistent, in-flow
// message; `Banner` is the transient one.
//
// Was `StateMessage`, which is what web calls `Alert`, with `tone` instead of
// `kind` and `message` instead of `body`. One concept, two names, on the two
// platforms that are supposed to stay in lockstep.
//
// The layout is deliberately not web's. Web draws a bordered inline strip
// because a desktop column is wide; a phone column is not, so this is a centred
// tinted block. Same name, same props, same severity vocabulary as `Banner` and
// `Toast` on both platforms — the layout is the platform's business.

import type { ReactNode } from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { Button } from "./Button";
import { Surface } from "./Surface";
import { useThemeTokens } from "./ThemeProvider";
import { nativeTokens } from "./tokens";

export type AlertKind = "info" | "success" | "warning" | "danger";

export interface AlertProps {
  kind?: AlertKind;
  title?: string;
  body: ReactNode;
  /** Primary action label. Paired with `onAction`, as on `EmptyState`. */
  cta?: string;
  onAction?: () => void;
  busy?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function Alert({
  kind = "info",
  title,
  body,
  cta,
  onAction,
  busy = false,
  style,
  testID,
}: AlertProps): JSX.Element {
  const tk = useThemeTokens();
  const background = {
    info: tk.color.surfaceSubtle,
    success: tk.color.successSoft,
    warning: tk.color.warningSoft,
    danger: tk.color.dangerSoft,
  }[kind];

  return (
    <Surface
      variant="tinted"
      padding="5"
      // Derived, not passed. Native took a `role` prop and defaulted it to
      // "alert" for every kind, so five screens had to pass `role="text"` to
      // stop a neutral notice interrupting a screen reader. Web already derived
      // this from severity; now both do.
      accessibilityRole={kind === "danger" || kind === "warning" ? "alert" : "text"}
      style={[styles.wrap, { backgroundColor: background }, style]}
      testID={testID}
    >
      <View style={styles.copy}>
        {title ? (
          <Text selectable style={[styles.title, { color: tk.color.ink }]}>
            {title}
          </Text>
        ) : null}
        <Text selectable style={[styles.body, { color: tk.color.inkMuted }]}>
          {body}
        </Text>
      </View>
      {onAction && cta ? (
        <View style={styles.action}>
          <Button
            variant={kind === "danger" ? "secondary" : "primary"}
            size="sm"
            loading={busy}
            disabled={busy}
            onPress={onAction}
            accessibilityLabel={cta}
          >
            {cta}
          </Button>
        </View>
      ) : null}
    </Surface>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    gap: nativeTokens.space[3],
  },
  copy: {
    alignSelf: "stretch",
    gap: nativeTokens.space[1],
  },
  title: {
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.h3.size,
    lineHeight: nativeTokens.type.scale.h3.line,
    fontWeight: "700",
    textAlign: "center",
  },
  body: {
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.body.size,
    lineHeight: nativeTokens.type.scale.body.line,
    textAlign: "center",
  },
  action: {
    alignItems: "center",
  },
});
