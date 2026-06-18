// Re-export the native token bundle so ui-native components pull from a
// single source. Every color / radius / spacing / font used in this package
// MUST come from here — never hardcode a hex or a px.

export { nativeTokens, nativeTokensDark, getNativeTokens } from "@baydar/ui-tokens/native";
export type { NativeTokens, NativeTheme, ColorScheme } from "@baydar/ui-tokens/native";
