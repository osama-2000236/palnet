// The applicant's position in the lifecycle, on the page they come back to.
//
// The badge said "applied" and stopped there; the rail says WHERE. Same four
// steps as the (not yet built) applications list, so the vocabulary is learned
// once — see handoff/components/StepRail.md rule 1.

import { ApplicationStatus, rejectionSummary, type Job } from "@baydar/shared";
import { Alert, StepRail, nativeTokens, useThemeTokens } from "@baydar/ui-native";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";

/**
 * Where each status sits on sent → seen → interview → decision.
 * `terminal: "closed"` greys the whole rail; rule 2 says it must be paired with
 * a sentence, which is what `note` below guarantees.
 */
const POSITION: Record<
  ApplicationStatus,
  { step: number; terminal: "none" | "success" | "closed" }
> = {
  [ApplicationStatus.SUBMITTED]: { step: 0, terminal: "none" },
  [ApplicationStatus.REVIEWING]: { step: 1, terminal: "none" },
  [ApplicationStatus.SHORTLISTED]: { step: 2, terminal: "none" },
  [ApplicationStatus.HIRED]: { step: 3, terminal: "success" },
  [ApplicationStatus.REJECTED]: { step: 3, terminal: "closed" },
  [ApplicationStatus.WITHDRAWN]: { step: 3, terminal: "closed" },
};

export function ApplicationRail({ job }: { job: Job }): JSX.Element | null {
  const { t } = useTranslation();
  const c = useThemeTokens().color;
  const status = job.viewer.applicationStatus;
  const reason = job.viewer.rejectionReason;

  // The rejection reason used to live in its own <JobOutcome/>. StepRail rule 2
  // says a closed rail must be paired with a sentence saying what happened, so
  // the two are one component now — the pairing is structural, not incidental.
  const outcome = reason ? (
    <Alert
      kind="info"
      title={t("jobs.rejectedTitle")}
      body={rejectionSummary(t(`employer.rejectionReasons.${reason}`), job.viewer.rejectionNote)}
    />
  ) : null;

  if (!job.viewer.hasApplied || !status) return outcome;

  const { step, terminal } = POSITION[status];
  const steps = [
    { key: "sent", label: t("applications.steps.sent") },
    { key: "seen", label: t("applications.steps.seen") },
    { key: "interview", label: t("applications.steps.interview") },
    { key: "decision", label: t("applications.steps.decision") },
  ];

  // A greyed rail with no explanation is exactly the thing this redesign
  // removes. REJECTED already renders its reason through <JobOutcome/>, so only
  // WITHDRAWN needs its own sentence here.
  const note = status === ApplicationStatus.WITHDRAWN ? t("applications.closedNote") : null;

  return (
    <View style={styles.wrap} testID="job-application-rail">
      <StepRail
        testID="job-step-rail"
        steps={steps}
        current={step}
        terminal={terminal}
        tone={terminal === "closed" ? "brand" : "accent"}
      />
      {note ? <Text style={[styles.note, { color: c.inkMuted }]}>{note}</Text> : null}
      {outcome}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: nativeTokens.space[2],
    paddingTop: nativeTokens.space[3],
  },
  note: {
    fontFamily: nativeTokens.type.family.body,
    fontSize: nativeTokens.type.scale.small.size,
    lineHeight: nativeTokens.type.scale.small.line,
    textAlign: "auto",
  },
});
