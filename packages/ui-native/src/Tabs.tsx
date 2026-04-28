import { createContext, useContext, type ReactNode } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { nativeTokens } from "./tokens";

interface TabsCtx {
  value: string;
  onChange(next: string): void;
}

const Ctx = createContext<TabsCtx | null>(null);

export interface TabsProps {
  value: string;
  onChange(next: string): void;
  children: ReactNode;
  label?: string;
}

export function Tabs({ value, onChange, children, label }: TabsProps): JSX.Element {
  return (
    <Ctx.Provider value={{ value, onChange }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        accessibilityRole="tablist"
        accessibilityLabel={label}
        contentContainerStyle={{ gap: nativeTokens.space[4] }}
        style={{ borderBottomWidth: 1, borderBottomColor: nativeTokens.color.lineSoft }}
      >
        {children}
      </ScrollView>
    </Ctx.Provider>
  );
}

export interface TabProps {
  value: string;
  children: ReactNode;
  count?: number;
}

export function Tab({ value, children, count }: TabProps): JSX.Element {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("<Tab> must be used inside <Tabs>");

  const active = ctx.value === value;
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={() => ctx.onChange(value)}
      style={{
        paddingVertical: nativeTokens.space[3],
        borderBottomWidth: 2,
        borderBottomColor: active ? nativeTokens.color.brand600 : "transparent",
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: nativeTokens.space[2] }}>
        <Text
          style={{
            color: active ? nativeTokens.color.ink : nativeTokens.color.inkMuted,
            fontFamily: nativeTokens.type.family.sans,
            fontSize: nativeTokens.type.scale.small.size,
            fontWeight: "500",
          }}
        >
          {children}
        </Text>
        {typeof count === "number" && count > 0 ? (
          <Text
            style={{
              color: active ? nativeTokens.color.brand700 : nativeTokens.color.inkMuted,
              backgroundColor: active ? nativeTokens.color.brand50 : nativeTokens.color.surfaceSubtle,
              borderRadius: nativeTokens.radius.full,
              overflow: "hidden",
              paddingHorizontal: nativeTokens.space[2],
              paddingVertical: nativeTokens.space[1],
              fontFamily: nativeTokens.type.family.sans,
              fontSize: nativeTokens.type.scale.caption.size,
              fontWeight: "600",
            }}
          >
            {count}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
