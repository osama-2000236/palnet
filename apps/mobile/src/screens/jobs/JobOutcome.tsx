// The applicant's own outcome on the job they applied to. There is no
// application-history screen, so this page is where someone comes back to find
// out what happened — and a rejection with no reason is the complaint the
// reason exists to answer.
//
// Web twin: the same block inline in apps/web/.../jobs/[id]/page.tsx.

import { rejectionSummary, type Job } from "@baydar/shared";
import { Alert } from "@baydar/ui-native";
import { useTranslation } from "react-i18next";

export function JobOutcome({ job }: { job: Job }): JSX.Element | null {
  const { t } = useTranslation();
  const reason = job.viewer.rejectionReason;
  if (!reason) return null;
  return (
    <Alert
      kind="info"
      title={t("jobs.rejectedTitle")}
      body={rejectionSummary(t(`employer.rejectionReasons.${reason}`), job.viewer.rejectionNote)}
    />
  );
}
