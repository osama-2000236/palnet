// Re-export the native token bundle so ui-native components pull from a
// single source. Every color / radius / spacing / font used in this package
// MUST come from here — never hardcode a hex or a px.

export { nativeTokens } from "@baydar/ui-tokens";
export type { NativeTokens } from "@baydar/ui-tokens";
