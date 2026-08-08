import { formatNumber, kilobytes, type Post } from "@baydar/shared";
import { useBandwidth } from "@baydar/shared/react";
import { PostMedia } from "@baydar/ui-native";
import { useTranslation } from "react-i18next";

/**
 * A post's images, wired to the bandwidth mode.
 *
 * Its own file so `PostRow.tsx` stays under the 300-LOC ceiling, and because
 * this is where the catalog and the mode meet — the kit component knows about
 * neither, which is what lets it be identical to its web twin. Replaces the
 * app-local grid that used to live here and always loaded every image.
 */
export function PostRowMedia({ media }: { media: Post["media"] }): JSX.Element | null {
  const { t, i18n } = useTranslation();
  const policy = useBandwidth().policy;

  return (
    <PostMedia
      media={media.map((m) => ({
        id: m.id ?? m.url,
        url: m.url,
        kind: m.kind === "IMAGE" ? "IMAGE" : "VIDEO",
        blurhash: m.blurhash,
        // The price, in the reader's digits. A member who cannot see what a
        // tap costs cannot decide whether to spend it.
        sizeLabel: m.sizeBytes
          ? t("connection.imageSize", {
              size: formatNumber(kilobytes(m.sizeBytes), i18n.language),
            })
          : null,
      }))}
      autoLoad={policy.autoLoadImages}
      allowVideo={policy.allowVideo}
      labels={{
        load: t("connection.loadImage"),
        loadUnknownSize: t("connection.loadImageUnknownSize"),
        videoUnavailable: t("connection.videoUnavailableSlow"),
      }}
    />
  );
}
