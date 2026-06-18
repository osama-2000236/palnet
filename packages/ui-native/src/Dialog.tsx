// Dialog — native twin of packages/ui-web/src/Dialog.tsx.
//
// MVP API; design final spec owed (HANDOFF-TO-DESIGN-2026-05-16 §C.22).
// Built on RN Modal; backdrop press closes when not `blocking`.

import type { ReactElement, ReactNode } from "react";
import { Modal, Pressable, Text, View } from "react-native";

import { shadowStyle } from "./shadow";
import { useThemeTokens } from "./ThemeProvider";
import { nativeTokens } from "./tokens";

export interface DialogProps {
  open: boolean;
  onClose(): void;
  title: string;
  blocking?: boolean;
  children: ReactNode;
}

export function Dialog({ open, onClose, title, blocking, children }: DialogProps): ReactElement {
  const c = useThemeTokens().color;
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
          onPress={(event) => event.stopPropagation()}
          accessibilityRole="alert"
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
              borderBottomColor: c.lineSoft,
              borderBottomWidth: 1,
              paddingHorizontal: nativeTokens.space[5],
              paddingVertical: nativeTokens.space[4],
            }}
          >
            <Text style={{ color: c.ink, fontSize: 16, fontWeight: "600" }}>{title}</Text>
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
