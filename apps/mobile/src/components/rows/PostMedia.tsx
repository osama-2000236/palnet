// A post's image grid. Split out of PostRow.tsx to keep it under the
// qa:design LOC ceiling. One image fills the width; two or more tile.

import { type Post } from "@baydar/shared";
import { nativeTokens } from "@baydar/ui-native";
import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";

export function PostMedia({ media }: { media: Post["media"] }): JSX.Element | null {
  if (media.length === 0) return null;
  const single = media.length === 1;
  return (
    <View style={styles.mediaRow}>
      {media.map((m) =>
        m.kind === "IMAGE" ? (
          <Image
            key={m.id ?? m.url}
            source={{ uri: m.url }}
            style={[styles.mediaImage, single ? styles.mediaSingle : styles.mediaPair]}
            contentFit="cover"
            cachePolicy="memory-disk"
            placeholder={m.blurhash ? { blurhash: m.blurhash } : undefined}
          />
        ) : null,
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  mediaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: nativeTokens.space[1],
  },
  mediaImage: {
    height: nativeTokens.space[20] * 2 + nativeTokens.space[5],
  },
  mediaSingle: { width: "100%" },
  mediaPair: { width: "49%" },
});
