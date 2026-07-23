// The report sheet's label bundle. Was hand-copied into three screens
// (PostRow, CommentsList, MessageThreadSheets) — one drifting `t()` key there
// meant one screen silently showing a raw key path.

import { ReportReason } from "@baydar/shared";
import { type ReportSheetLabels } from "@baydar/ui-native";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

export function useReportLabels(): ReportSheetLabels {
  const { t } = useTranslation();
  return useMemo(
    () => ({
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
    }),
    [t],
  );
}
