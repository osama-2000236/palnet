// Avatar — native twin of packages/ui-web/src/Avatar.tsx.
// Same prop API (user + size + ring + online + alt). Rendering uses React
// Native primitives — <View> for the frame, <Image> for the photo,
// <Text> for initials. All colors come from nativeTokens.

import { Image, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { nativeTokens } from "./tokens";

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

export interface AvatarUser {
  id?: string | null;
  handle?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
}

export interface AvatarProps {
  user: AvatarUser | null | undefined;
  size?: AvatarSize;
  ring?: boolean;
  online?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Accessible label override. Defaults to the person's name. */
  alt?: string;
}

const BOX_SIZE: Record<AvatarSize, number> = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 56,
  xl: 96,
};

const TEXT_SIZE: Record<AvatarSize, number> = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 18,
  xl: 30,
};

const DOT_SIZE: Record<AvatarSize, number> = {
  xs: 7,
  sm: 9,
  md: 11,
  lg: 13,
  xl: 15,
};

// Three token-backed palettes, chosen deterministically from the seed so the
// same person always gets the same colour across the app.
const PALETTES: { bg: string; fg: string }[] = [
  { bg: nativeTokens.color.brand100, fg: nativeTokens.color.brand700 },
  { bg: nativeTokens.color.accent50, fg: nativeTokens.color.accent600 },
  { bg: nativeTokens.color.surfaceSunken, fg: nativeTokens.color.ink },
];

function paletteFor(seed: string): { bg: string; fg: string } {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  const idx = Math.abs(hash) % PALETTES.length;
  return PALETTES[idx] ?? PALETTES[0]!;
}

function initialsOf(user: AvatarUser): string {
  const first = (user.firstName ?? "").trim();
  const last = (user.lastName ?? "").trim();
  if (first || last) {
    return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase() || "?";
  }
  const handle = (user.handle ?? "").trim();
  if (handle) return handle.slice(0, 2).toUpperCase();
  return "?";
}

function nameOf(user: AvatarUser): string {
  const joined = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
  return joined || user.handle || "";
}

export function Avatar({
  user,
  size = "md",
  ring = false,
  online = false,
  style,
  alt,
}: AvatarProps): JSX.Element | null {
  if (!user) return null;

  const seed = user.id || user.handle || nameOf(user) || "0";
  const palette = paletteFor(seed);
  const initials = initialsOf(user);
  const label = alt ?? nameOf(user);
  const box = BOX_SIZE[size];
  const ringWidth = ring ? 2 : 0;
  const ringGap = ring ? 2 : 0;
  const outer = box + (ringWidth + ringGap) * 2;

  const frame: ViewStyle = {
    width: box,
    height: box,
    borderRadius: box / 2,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: user.avatarUrl ? nativeTokens.color.surfaceSunken : palette.bg,
  };

  const xlBorder: ViewStyle =
    size === "xl"
      ? {
          borderWidth: 3,
          borderColor: nativeTokens.color.surface,
        }
      : {};

  const ringFrame: ViewStyle = ring
    ? {
        width: outer,
        height: outer,
        borderRadius: outer / 2,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: ringWidth,
        borderColor: nativeTokens.color.brand600,
        padding: ringGap,
      }
    : {};

  const dot: ViewStyle = {
    position: "absolute",
    bottom: 0,
    // Logical end: in an RTL layout the caller's parent will handle mirroring.
    // We inset by ~6% of the box so the dot sits on the bottom-end curve.
    right: 0,
    width: DOT_SIZE[size],
    height: DOT_SIZE[size],
    borderRadius: DOT_SIZE[size] / 2,
    borderWidth: 2,
    borderColor: nativeTokens.color.surface,
    backgroundColor: nativeTokens.color.success,
  };

  const avatarBody = (
    <View style={[frame, xlBorder]}>
      {user.avatarUrl ? (
        <Image
          accessibilityLabel={label || undefined}
          source={{ uri: user.avatarUrl }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      ) : (
        <Text
          style={{
            color: palette.fg,
            fontSize: TEXT_SIZE[size],
            fontWeight: "600",
            fontFamily: nativeTokens.type.family.sans,
          }}
          accessibilityElementsHidden
        >
          {initials}
        </Text>
      )}
    </View>
  );

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={label || undefined}
      style={[ring ? ringFrame : null, style]}
    >
      {avatarBody}
      {online ? <View style={dot} pointerEvents="none" /> : null}
    </View>
  );
}
