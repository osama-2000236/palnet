// Switch — native twin of packages/ui-web/src/Switch.tsx.
//
// Same prop vocabulary (checked / onChange / ariaLabel / disabled).
// Tokenised colors via nativeTokens. RTL: thumb slides in the writing
// direction (`I18nManager.isRTL` flips the X translation sign).
//
// Hitslop guarantees a 44pt touch target even with the compact 36x20 visual.

import type { ReactElement } from "react";
import { I18nManager, Pressable, View, type StyleProp, type ViewStyle } from "react-native";

import { nativeTokens } from "./tokens";

export interface SwitchProps {
  checked: boolean;
  onChange(value: boolean): void;
  ariaLabel: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

const TRACK_WIDTH = 36;
const TRACK_HEIGHT = 20;
const THUMB = 16;
const PAD = 2;
const OFFSET = TRACK_WIDTH - THUMB - PAD * 2; // distance the thumb travels

export function Switch({
  checked,
  onChange,
  ariaLabel,
  disabled,
  style,
}: SwitchProps): ReactElement {
  const c = nativeTokens.color;
  const direction = I18nManager.isRTL ? -1 : 1;
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked, disabled: !!disabled }}
      accessibilityLabel={ariaLabel}
      disabled={disabled}
      onPress={() => onChange(!checked)}
      hitSlop={12}
      style={[
        {
          width: TRACK_WIDTH,
          height: TRACK_HEIGHT,
          borderRadius: nativeTokens.radius.full,
          backgroundColor: checked ? c.brand600 : c.surfaceSunken,
          opacity: disabled ? 0.55 : 1,
          justifyContent: "center",
        },
        style,
      ]}
    >
      <View
        style={{
          position: "absolute",
          top: PAD,
          start: PAD,
          width: THUMB,
          height: THUMB,
          borderRadius: nativeTokens.radius.full,
          backgroundColor: c.inkInverse,
          transform: [{ translateX: checked ? OFFSET * direction : 0 }],
        }}
      />
    </Pressable>
  );
}
