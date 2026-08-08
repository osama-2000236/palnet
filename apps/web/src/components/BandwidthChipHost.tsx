"use client";

import { nextBandwidthMode } from "@baydar/shared";
import { useBandwidth } from "@baydar/shared/react";
import { BandwidthChip } from "@baydar/ui-web";
import { useTranslations } from "next-intl";
import type { JSX } from "react";

import { persistBandwidthOverride } from "@/lib/bandwidth";

/**
 * The mode chip, wired to the store and the catalog.
 *
 * The kit component takes labels and a callback and knows nothing about
 * either, which is what keeps it identical to its native twin.
 */
export function BandwidthChipHost(): JSX.Element {
  const t = useTranslations("connection");
  const { mode } = useBandwidth();

  return (
    <BandwidthChip
      mode={mode}
      label={t(`modeHelp.${mode}`)}
      labels={{ light: t("mode.light"), normal: t("mode.normal"), full: t("mode.full") }}
      onClick={() => persistBandwidthOverride(nextBandwidthMode(mode))}
    />
  );
}
