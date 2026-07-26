// Switch — native twin of packages/ui-web/src/Switch.tsx.
//
// Same prop vocabulary (checked / onChange / ariaLabel / disabled).
// RTL: the thumb slides in the writing direction (`I18nManager.isRTL` flips the
// X translation sign).
//
// hitSlop guarantees a 44pt touch target around the compact 36x20 visual.

import { useEffect, useRef, type ReactElement } from "react";
import { Animated, I18nManager, Pressable, type StyleProp, type ViewStyle } from "react-native";

import { useThemeTokens } from "./ThemeProvider";
import { nativeTokens } from "./tokens";
import { useReducedMotion } from "./useReducedMotion";

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
  const c = useThemeTokens().color;
  const reduceMotion = useReducedMotion();
  const direction = I18nManager.isRTL ? -1 : 1;

  // A4.1: the thumb used to jump — a bare `transform: translateX` with no
  // animation, while the web twin animated. A dead toggle is the clearest
  // "unfinished app" signal there is, and this is the most-tapped control in
  // Settings. `Animated` from core RN, already used by Skeleton; Reanimated
  // would mean a new peer dependency on the shared kit for one spring.
  const progress = useRef(new Animated.Value(checked ? 1 : 0)).current;

  useEffect(() => {
    const to = checked ? 1 : 0;
    if (reduceMotion) {
      progress.setValue(to);
      return;
    }
    const { stiffness, damping, mass } = nativeTokens.motion.spring.toggle;
    Animated.spring(progress, {
      toValue: to,
      stiffness,
      damping,
      mass,
      useNativeDriver: true,
    }).start();
  }, [checked, progress, reduceMotion]);

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, OFFSET * direction],
  });

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
          // A6: the OFF track is 1.23:1 against the surface and no fill in this
          // palette can reach the 3:1 WCAG 1.4.11 asks for, so the boundary is a
          // border — matching the web twin.
          borderWidth: 1,
          borderColor: checked ? c.brand600 : c.inkSubtle,
          opacity: disabled ? 0.55 : 1,
          justifyContent: "center",
        },
        style,
      ]}
    >
      <Animated.View
        style={{
          position: "absolute",
          top: PAD,
          start: PAD,
          width: THUMB,
          height: THUMB,
          borderRadius: nativeTokens.radius.full,
          // A1.1: was `c.inkInverse`, which is near-black in dark mode while the
          // web twin was hardcoded white — the same component, opposite colours
          // per platform. One semantic token now, with a border so the thumb is
          // visible against the light OFF track too.
          backgroundColor: c.switchThumb,
          borderWidth: 1,
          borderColor: c.inkSubtle,
          transform: [{ translateX }],
        }}
      />
    </Pressable>
  );
}
