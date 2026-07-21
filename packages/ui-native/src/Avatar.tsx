// Avatar — native twin of packages/ui-web/src/Avatar.tsx.
// Same prop API (user + size + ring + online + alt). Rendering uses React
// Native primitives — <View> for the frame, expo-image for the photo,
// <Text> for initials. All colors come from nativeTokens.

import { Image } from "expo-image";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { useThemeTokens } from "./ThemeProvider";
import { nativeTokens } from "./tokens";

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

export interface AvatarUser {
  id?: string | null;
  handle?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
  avatarBlurhash?: string | null;
}

export interface AvatarProps {
  user: AvatarUser | null | undefined;
  size?: AvatarSize;
  ring?: boolean;
  online?: boolean;
  style?: StyleProp<ViewStyle>;
  blurhash?: string | null;
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

// Token-backed palettes, chosen deterministically from the seed so the same
// person always gets the same colour across the app. Palettes come from the
// active theme so the dark-mode set (light-on-dark chips) is used in dark.
function paletteFor(
  seed: string,
  palettes: typeof nativeTokens.avatar.palette,
): { bg: string; fg: string } {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  const idx = Math.abs(hash) % palettes.length;
  return palettes[idx] ?? palettes[0]!;
}

// Skip the Arabic definite article so "الخطيب" yields "خ" — otherwise
// names like "ليان الخطيب" spell "لا" ("no") as their initials.
function initialLetter(word: string): string {
  const bare = word.startsWith("ال") && word.length > 2 ? word.slice(2) : word;
  return bare[0] ?? "";
}

function initialsOf(user: AvatarUser): string {
  const first = (user.firstName ?? "").trim();
  const last = (user.lastName ?? "").trim();
  if (first || last) {
    return `${initialLetter(first)}${initialLetter(last)}`.toUpperCase() || "?";
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
  blurhash,
  alt,
}: AvatarProps): JSX.Element | null {
  if (!user) return null;

  const tk = useThemeTokens();
  const seed = user.id || user.handle || nameOf(user) || "0";
  const palette = paletteFor(seed, tk.avatar.palette);
  const initials = initialsOf(user);
  const label = alt ?? nameOf(user);
  const placeholder = blurhash ?? user.avatarBlurhash ?? null;
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
    backgroundColor: user.avatarUrl ? tk.color.surfaceSunken : palette.bg,
  };

  const xlBorder: ViewStyle =
    size === "xl"
      ? {
          borderWidth: 3,
          borderColor: tk.color.surface,
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
        borderColor: tk.color.brand600,
        padding: ringGap,
      }
    : {};

  const dot: ViewStyle = {
    position: "absolute",
    bottom: 0,
    // Logical end: in an RTL layout the caller's parent will handle mirroring.
    // We inset by ~6% of the box so the dot sits on the bottom-end curve.
    end: 0,
    width: DOT_SIZE[size],
    height: DOT_SIZE[size],
    borderRadius: DOT_SIZE[size] / 2,
    borderWidth: 2,
    borderColor: tk.color.surface,
    backgroundColor: tk.color.success,
  };

  const avatarBody = (
    <View style={[frame, xlBorder]}>
      {user.avatarUrl ? (
        <Image
          accessibilityLabel={label || undefined}
          source={{ uri: user.avatarUrl }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy="memory-disk"
          placeholder={placeholder ? { blurhash: placeholder } : undefined}
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
