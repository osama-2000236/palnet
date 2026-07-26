// Bottom sheet primitive for mobile. Wraps RN's built-in Modal — no extra
// deps, works on iOS + Android + web. The public API is a subset of
// @gorhom/bottom-sheet's, so migrating there for snap points and detents stays
// a render-shape change only.
//
// ponytail: dismiss is a single threshold, not detents. Add snap points when a
// screen actually needs a half-open state; none does today.
//
// Usage:
//   <Sheet open={open} onClose={close} title="Filters">
//     <Text>body</Text>
//   </Sheet>
//
// The sheet renders via Modal (full-screen portal), dims the backdrop, and
// pins the content to the bottom with a top-rounded card. Tap outside, press
// the close button, or drag the grabber down to dismiss. RTL aware: the close
// button sits at the `end` edge via `writingDirection`/flexDirection flip.
//
// A4.9: the grabber used to be decorative. This header claimed "swipe the
// handle area to close" and there was no PanResponder anywhere in the file —
// users would drag it and nothing would happen. By the project's own rule ("a
// glyph that does nothing is worse than no glyph") it had to be wired or
// removed. Wired, using core RN's PanResponder rather than a gesture library,
// because the shared kit takes no new dependencies.

import { useEffect, useMemo, useRef, type ReactNode } from "react";
import {
  Animated,
  I18nManager,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type ScrollViewProps,
} from "react-native";

import { shadowStyle } from "./shadow";
import { useThemeTokens } from "./ThemeProvider";
import { nativeTokens } from "./tokens";
import { useReducedMotion } from "./useReducedMotion";

export interface SheetProps {
  /** Whether the sheet is visible. */
  open: boolean;
  /** Called when the user dismisses (backdrop tap, hardware back, close btn). */
  onClose: () => void;
  /** Optional title rendered in a sticky header row. */
  title?: string;
  /** Sheet content. Wrapped in a ScrollView by default. */
  children: ReactNode;
  /** Disable the built-in ScrollView (for fully custom layouts). */
  scroll?: boolean;
  /** Props forwarded to the inner ScrollView. */
  scrollProps?: ScrollViewProps;
  /** Accessibility label for the close button. Defaults to "Close". */
  closeLabel?: string;
  /** Accessibility label for the sheet wrapper. Defaults to `title`. */
  accessibilityLabel?: string;
}

export function Sheet({
  open,
  onClose,
  title,
  children,
  scroll = true,
  scrollProps,
  closeLabel = "Close",
  accessibilityLabel,
}: SheetProps): JSX.Element {
  const { height } = useWindowDimensions();
  const cardMaxHeight = Math.max(320, Math.floor(height * 0.85));
  const c = useThemeTokens().color;
  const reduceMotion = useReducedMotion();

  // Drag offset of the card, in px below its resting position. Never negative:
  // dragging a bottom sheet *up* past its own top edge is not a gesture, it is
  // a rubber-band bug.
  const dragY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (open) dragY.setValue(0);
  }, [open, dragY]);

  const settle = useMemo(
    () => (): void => {
      const { stiffness, damping, mass } = nativeTokens.motion.spring.sheet;
      if (reduceMotion) {
        dragY.setValue(0);
        return;
      }
      Animated.spring(dragY, {
        toValue: 0,
        stiffness,
        damping,
        mass,
        useNativeDriver: true,
      }).start();
    },
    [dragY, reduceMotion],
  );

  const pan = useMemo(
    () =>
      PanResponder.create({
        // Claim the gesture only once it is clearly a downward drag, so a tap on
        // the grabber still reaches the Pressable underneath it.
        onMoveShouldSetPanResponder: (_event, gesture) =>
          gesture.dy > 4 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onPanResponderMove: (_event, gesture) => {
          dragY.setValue(Math.max(0, gesture.dy));
        },
        onPanResponderRelease: (_event, gesture) => {
          // Dismiss on distance OR on a flick: a fast short drag reads as
          // "close" to the hand even though it never crossed the threshold.
          const far = gesture.dy > cardMaxHeight * 0.25;
          const flick = gesture.vy > 0.8;
          if (far || flick) onClose();
          else settle();
        },
        onPanResponderTerminate: settle,
      }),
    [cardMaxHeight, dragY, onClose, settle],
  );

  return (
    <Modal
      transparent
      visible={open}
      animationType={reduceMotion ? "none" : "slide"}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable
        style={[styles.backdrop, { backgroundColor: c.scrim }]}
        onPress={onClose}
        accessibilityLabel={closeLabel}
        accessibilityRole="button"
      />

      <Animated.View
        style={[
          styles.card,
          {
            maxHeight: cardMaxHeight,
            backgroundColor: c.surface,
            transform: [{ translateY: dragY }],
          },
        ]}
        pointerEvents="box-none"
        accessible
        accessibilityViewIsModal
        // ponytail: no accessibilityRole here — RN has no "dialog" role and
        // Android's ReactViewManager throws on it at mount. The native Modal
        // already announces as a dialog; accessibilityViewIsModal traps focus
        // on iOS. Label alone carries the name.
        accessibilityLabel={accessibilityLabel ?? title}
      >
        {/* The grabber is the drag surface. `handleWrap` is padded to a legal
            target rather than the 4pt bar it draws. */}
        <View {...pan.panHandlers} style={styles.handleWrap}>
          <View style={[styles.handle, { backgroundColor: c.lineHard }]} />
        </View>

        {title ? (
          <View
            style={[
              styles.header,
              // Flip header items for RTL so the close button sits at the
              // logical end edge.
              I18nManager.isRTL ? { flexDirection: "row-reverse" } : { flexDirection: "row" },
            ]}
          >
            <Text style={[styles.title, { color: c.ink }]} numberOfLines={1}>
              {title}
            </Text>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={closeLabel}
              style={styles.closeBtn}
            >
              <Text style={[styles.closeGlyph, { color: c.inkMuted }]}>✕</Text>
            </Pressable>
          </View>
        ) : null}

        {scroll ? (
          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            keyboardShouldPersistTaps="handled"
            {...scrollProps}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.body, styles.bodyContent]}>{children}</View>
        )}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    position: "absolute",
    start: 0,
    end: 0,
    bottom: 0,
    borderTopStartRadius: nativeTokens.radius.xl,
    borderTopEndRadius: nativeTokens.radius.xl,
    paddingBottom: nativeTokens.space[6],
    ...shadowStyle("pop"),
  },
  handleWrap: {
    alignItems: "center",
    justifyContent: "center",
    // The bar draws 4pt; the drag surface is a legal target.
    minHeight: nativeTokens.target.min,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  header: {
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: nativeTokens.space[4],
    paddingBottom: nativeTokens.space[2],
  },
  title: {
    flex: 1,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.h2.size,
    lineHeight: nativeTokens.type.scale.h2.line,
    fontWeight: "600",
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: nativeTokens.radius.full,
  },
  closeGlyph: {
    fontSize: 18,
    fontWeight: "600",
  },
  body: {
    paddingHorizontal: nativeTokens.space[4],
  },
  bodyContent: {
    paddingTop: nativeTokens.space[2],
    paddingBottom: nativeTokens.space[4],
    gap: nativeTokens.space[3],
  },
});
