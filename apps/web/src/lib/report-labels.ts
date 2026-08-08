// The report dialog's label bundle. Was hand-copied into four surfaces on web
// (PostCard, Comments, RoomView, the public profile) — one drifting `t()` key
// there means one surface silently rendering a raw key path.
//
// Mobile has had `apps/mobile/src/lib/report-labels.ts` since its own third
// copy appeared; this is the same helper under the same name, which is what
// "web and native stay in lockstep" means for the non-component layer too.

"use client";

import { ReportReason } from "@baydar/shared";
import type { ReportDialogLabels } from "@baydar/ui-web";
import { useTranslations } from "next-intl";

export function useReportLabels(): ReportDialogLabels {
  const t = useTranslations("safety");
  const tCommon = useTranslations("common");
  return {
    title: t("report.title"),
    detailsLabel: t("report.details_label"),
    cancel: tCommon("cancel"),
    submit: t("report.submit"),
    close: t("report.close"),
    reasons: {
      [ReportReason.SPAM]: t("report.reason.spam"),
      [ReportReason.HARASSMENT]: t("report.reason.harassment"),
      [ReportReason.HATE]: t("report.reason.hate"),
      [ReportReason.MISINFORMATION]: t("report.reason.misinformation"),
      [ReportReason.NUDITY]: t("report.reason.nudity"),
      [ReportReason.VIOLENCE]: t("report.reason.violence"),
      [ReportReason.FEE_REQUEST]: t("report.reason.fee_request"),
      [ReportReason.GHOST_JOB]: t("report.reason.ghost_job"),
      [ReportReason.ID_REQUEST]: t("report.reason.id_request"),
      [ReportReason.OTHER]: t("report.reason.other"),
    },
  };
}
