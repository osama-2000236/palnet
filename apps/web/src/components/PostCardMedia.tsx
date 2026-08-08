"use client";

import { formatNumber, kilobytes, type Post } from "@baydar/shared";
import { useBandwidth } from "@baydar/shared/react";
import { PostMedia } from "@baydar/ui-web";
import { useLocale, useTranslations } from "next-intl";
import type { JSX } from "react";

/**
 * A post's images, wired to the bandwidth mode.
 *
 * Its own file so `PostCard.tsx` stays under the 300-LOC ceiling, and because
 * this is where the catalog and the mode meet — the kit component knows about
 * neither, which is what lets it be identical to its native twin.
 */
export function PostCardMedia({ media }: { media: Post["media"] }): JSX.Element | null {
  const locale = useLocale();
  const t = useTranslations("connection");
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
          ? t("imageSize", { size: formatNumber(kilobytes(m.sizeBytes), locale) })
          : null,
      }))}
      autoLoad={policy.autoLoadImages}
      allowVideo={policy.allowVideo}
      labels={{
        load: t("loadImage"),
        loadUnknownSize: t("loadImageUnknownSize"),
        videoUnavailable: t("videoUnavailableSlow"),
      }}
    />
  );
}
