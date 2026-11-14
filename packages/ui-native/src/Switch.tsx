// Switch — native twin of packages/ui-web/src/Switch.tsx.
//
// Same prop vocabulary (checked / onChange / ariaLabel / disabled).
// Tokenised colors via nativeTokens. RTL: thumb rests at the writing-direction
// *start* when off and *end* when on (no negative translate from left: PAD).
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

/** Exported for unit tests that assert geometry without rendering. */
export const SWITCH_TRACK_WIDTH = 36;
export const SWITCH_TRACK_HEIGHT = 20;
export const SWITCH_THUMB = 16;
export const SWITCH_PAD = 2;
/** Distance the thumb travels between off and on. */
export const SWITCH_OFFSET = SWITCH_TRACK_WIDTH - SWITCH_THUMB - SWITCH_PAD * 2;

/**
 * Absolute `left` for the thumb inside the track.
 * Unchecked sits at writing-direction start; checked at end.
 */
export function switchThumbLeft(checked: boolean, isRTL: boolean = I18nManager.isRTL): number {
  if (isRTL) {
    // Start = right side of track, end = left side.
    return checked ? SWITCH_PAD : SWITCH_PAD + SWITCH_OFFSET;
  }
  return checked ? SWITCH_PAD + SWITCH_OFFSET : SWITCH_PAD;
}

export function Switch({
  checked,
  onChange,
  ariaLabel,
  disabled,
  style,
}: SwitchProps): ReactElement {
  const c = nativeTokens.color;
  const thumbLeft = switchThumbLeft(checked);
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
          width: SWITCH_TRACK_WIDTH,
          height: SWITCH_TRACK_HEIGHT,
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
          top: SWITCH_PAD,
          left: thumbLeft,
          width: SWITCH_THUMB,
          height: SWITCH_THUMB,
          borderRadius: nativeTokens.radius.full,
          backgroundColor: c.inkInverse,
        }}
      />
    </Pressable>
  );
}
