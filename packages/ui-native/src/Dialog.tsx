// Dialog — native twin of packages/ui-web/src/Dialog.tsx.
//
// MVP API; design final spec owed (HANDOFF-TO-DESIGN-2026-05-16 §C.22).
// Built on RN Modal; backdrop press closes when not `blocking`.

import type { ReactElement, ReactNode } from "react";
import { I18nManager, Modal, Pressable, Text, View } from "react-native";

import { shadowStyle } from "./shadow";
import { nativeTokens } from "./tokens";

export interface DialogProps {
  open: boolean;
  onClose(): void;
  title: string;
  closeLabel?: string;
  blocking?: boolean;
  children: ReactNode;
}

export function Dialog({
  open,
  onClose,
  title,
  closeLabel = "Close",
  blocking,
  children,
}: DialogProps): ReactElement {
  const c = nativeTokens.color;
  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!blocking) onClose();
      }}
    >
      <Pressable
        onPress={() => {
          if (!blocking) onClose();
        }}
        style={{
          flex: 1,
          backgroundColor: c.scrim,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: nativeTokens.space[4],
        }}
      >
        <Pressable
          // Stop press propagation so taps inside the card don't dismiss.
          onStartShouldSetResponder={() => true}
          onPress={(event) => event.stopPropagation()}
          accessibilityRole={"dialog" as never}
          accessibilityViewIsModal
          accessibilityLabel={title}
          style={{
            width: "100%",
            maxWidth: 420,
            backgroundColor: c.surface,
            borderRadius: nativeTokens.radius.lg,
            ...shadowStyle("pop"),
          }}
        >
          <View
            style={{
              flexDirection: I18nManager.isRTL ? "row-reverse" : "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: nativeTokens.space[3],
              borderBottomColor: c.lineSoft,
              borderBottomWidth: 1,
              paddingHorizontal: nativeTokens.space[5],
              paddingVertical: nativeTokens.space[4],
            }}
          >
            <Text style={{ flex: 1, color: c.ink, fontSize: 16, fontWeight: "600" }}>{title}</Text>
            {!blocking ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={closeLabel}
                onPress={onClose}
                hitSlop={8}
                style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
              >
                <Text aria-hidden style={{ color: c.inkMuted, fontSize: 22, lineHeight: 24 }}>
                  ×
                </Text>
              </Pressable>
            ) : null}
          </View>
          <View
            style={{
              paddingHorizontal: nativeTokens.space[5],
              paddingVertical: nativeTokens.space[4],
            }}
          >
            {children}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
