// PostMedia - native twin of packages/ui-web/src/PostMedia.tsx.
//
// Same prop vocabulary: media / autoLoad / allowVideo / labels. Native has no
// `className`. `PostCard` already takes its media as a slot on this platform,
// so this is what a screen puts in it.
//
// On a 2G connection an image is the most expensive thing on screen by an
// order of magnitude, so `light` does not fetch one until the member asks —
// and the button says what tapping it will cost, because a member who cannot
// see the price cannot decide.

import { Image } from "expo-image";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Icon } from "./Icon";
import { useThemeTokens } from "./ThemeProvider";
import { nativeTokens } from "./tokens";

export interface PostMediaItem {
  id?: string | null;
  url: string;
  kind: "IMAGE" | "VIDEO";
  /** Drawn while an image is not loaded. Produced at upload. */
  blurhash?: string | null;
  /** Pre-formatted by the host, in the reader's digits — e.g. «٤٨ ك.ب». */
  sizeLabel?: string | null;
}

export interface PostMediaLabels {
  /** The button. Host interpolates the size: «تحميل الصورة · ٤٨ ك.ب». */
  load: string;
  /** Alternative when the size is unknown. */
  loadUnknownSize: string;
  /** Why the play button is disabled on a slow connection. */
  videoUnavailable: string;
}

export interface PostMediaProps {
  media: PostMediaItem[];
  /**
   * False on `light`: draw the placeholder and wait to be asked. The host
   * reads this from the bandwidth policy; the kit stays store-free.
   */
  autoLoad?: boolean;
  /** False on `light`. Video has no small variant to fall back to. */
  allowVideo?: boolean;
  labels: PostMediaLabels;
}

export function PostMedia({
  media,
  autoLoad = true,
  allowVideo = true,
  labels,
}: PostMediaProps): JSX.Element | null {
  const c = useThemeTokens().color;
  // Per-item, not per-card: a member who paid for one image has not agreed to
  // pay for the other three.
  const [revealed, setRevealed] = useState<Set<string>>(() => new Set());

  if (media.length === 0) return null;

  // One image fills the width; two or more tile, same as web's grid.
  const cell = media.length === 1 ? styles.single : styles.pair;

  return (
    <View style={styles.grid}>
      {media.map((m, i) => {
        const key = m.id ?? m.url ?? String(i);
        const show = autoLoad || revealed.has(key);

        if (m.kind === "VIDEO") {
          return (
            <View
              key={key}
              style={[styles.placeholder, cell, { backgroundColor: c.surfaceSubtle }]}
            >
              <Icon name="video" size={32} color={c.inkMuted} />
              {allowVideo ? null : (
                <Text style={[styles.caption, { color: c.inkMuted }]}>
                  {labels.videoUnavailable}
                </Text>
              )}
            </View>
          );
        }

        if (show) {
          return (
            <Image
              key={key}
              source={{ uri: m.url }}
              placeholder={m.blurhash ? { blurhash: m.blurhash } : undefined}
              contentFit="cover"
              cachePolicy="memory-disk"
              style={[styles.image, cell]}
              accessibilityIgnoresInvertColors
            />
          );
        }

        return (
          <Pressable
            key={key}
            accessibilityRole="button"
            accessibilityLabel={
              m.sizeLabel ? `${labels.load} · ${m.sizeLabel}` : labels.loadUnknownSize
            }
            onPress={() => setRevealed((prev) => new Set(prev).add(key))}
            style={[styles.placeholder, cell, { backgroundColor: c.surfaceSunken }]}
          >
            <Icon name="image" size={28} color={c.inkMuted} />
            <Text style={[styles.caption, { color: c.inkMuted }]}>
              {m.sizeLabel ? `${labels.load} · ${m.sizeLabel}` : labels.loadUnknownSize}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: nativeTokens.space[1] },
  single: { width: "100%" },
  pair: { width: "49%" },
  image: { aspectRatio: 16 / 9 },
  placeholder: {
    aspectRatio: 16 / 9,
    alignItems: "center",
    justifyContent: "center",
    gap: nativeTokens.space[2],
    padding: nativeTokens.space[4],
  },
  caption: {
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.small.size,
    textAlign: "center",
  },
});
