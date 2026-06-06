import { ReportReason } from "@baydar/shared";
import type { BlockButtonLabels, ReportSheetLabels } from "@baydar/ui-native";
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

export function reportSheetLabels(t: TFunction): ReportSheetLabels {
  return {
    title: t("safety.report.title"),
    detailsLabel: t("safety.report.details_label"),
    cancel: t("common.cancel"),
    submit: t("safety.report.submit"),
    close: t("safety.report.close"),
    reasons: {
      [ReportReason.SPAM]: t("safety.report.reason.spam"),
      [ReportReason.HARASSMENT]: t("safety.report.reason.harassment"),
      [ReportReason.HATE]: t("safety.report.reason.hate"),
      [ReportReason.MISINFORMATION]: t("safety.report.reason.misinformation"),
      [ReportReason.NUDITY]: t("safety.report.reason.nudity"),
      [ReportReason.VIOLENCE]: t("safety.report.reason.violence"),
      [ReportReason.OTHER]: t("safety.report.reason.other"),
    },
  };
}
