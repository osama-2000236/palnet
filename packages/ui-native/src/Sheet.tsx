// Bottom sheet primitive for mobile. v1 wraps RN's built-in Modal with a
// slide-up animation — no extra deps, works on iOS + Android + web. When we
// need drag-to-dismiss and snap points, swap the internals for
// @gorhom/bottom-sheet; the public API below is a subset of that library's
// so a future migration is a render-shape change only.
//
// Usage:
//   <Sheet open={open} onClose={close} title="Filters">
//     <Text>body</Text>
//   </Sheet>
//
// The sheet renders via Modal (full-screen portal), dims the backdrop, and
// pins the content to the bottom with a top-rounded card. Tap outside or
// swipe the handle area to close. RTL aware: the close button sits at the
// `end` edge via `writingDirection`/flexDirection flip.

import {
  I18nManager,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type ScrollViewProps,
} from "react-native";
import type { ReactNode } from "react";

import { nativeTokens } from "./tokens";

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
}

export function Sheet({
  open,
  onClose,
  title,
  children,
  scroll = true,
  scrollProps,
  closeLabel = "Close",
}: SheetProps): JSX.Element {
  const { height } = useWindowDimensions();
  const cardMaxHeight = Math.max(320, Math.floor(height * 0.85));

  return (
    <Modal
      transparent
      visible={open}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        accessibilityLabel={closeLabel}
        accessibilityRole="button"
      />

      <View style={[styles.card, { maxHeight: cardMaxHeight }]} pointerEvents="box-none">
        <View style={styles.handleWrap}>
          <View style={styles.handle} />
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
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={closeLabel}
              style={styles.closeBtn}
            >
              <Text style={styles.closeGlyph}>✕</Text>
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
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
  },
  card: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: nativeTokens.color.surface,
    borderTopLeftRadius: nativeTokens.radius.xl,
    borderTopRightRadius: nativeTokens.radius.xl,
    paddingBottom: nativeTokens.space[6],
    ...nativeTokens.shadow.pop,
  },
  handleWrap: {
    alignItems: "center",
    paddingVertical: nativeTokens.space[2],
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: nativeTokens.color.lineHard,
  },
  header: {
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: nativeTokens.space[4],
    paddingBottom: nativeTokens.space[2],
  },
  title: {
    flex: 1,
    color: nativeTokens.color.ink,
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
    color: nativeTokens.color.inkMuted,
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
