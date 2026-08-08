// Block-button labels only. The report bundle used to be duplicated here as
// `reportSheetLabels`; it is `useReportLabels` in @/lib/report-labels, which is
// the single copy its own header claims. Adding three report reasons is what
// surfaced the second one.

import type { BlockButtonLabels } from "@baydar/ui-native";
import type { TFunction } from "i18next";

export function blockButtonLabels(t: TFunction, isBlocked: boolean): BlockButtonLabels {
  return isBlocked
    ? {
        block: t("safety.block.button"),
        unblock: t("safety.unblock.button"),
        confirmTitle: t("safety.unblock.confirm.title"),
        confirmBody: t("safety.unblock.confirm.body"),
        confirmCta: t("safety.unblock.confirm.cta"),
        cancel: t("common.cancel"),
      }
    : {
        block: t("safety.block.button"),
        unblock: t("safety.unblock.button"),
        confirmTitle: t("safety.block.confirm.title"),
        confirmBody: t("safety.block.confirm.body"),
        confirmCta: t("safety.block.confirm.cta"),
        cancel: t("common.cancel"),
      };
}
