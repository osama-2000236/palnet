// The two static sections below the job hero. Lifted out of the screen so the
// route file stays under the 300-LOC cap; no behaviour change.

import { belowMinimumWage, formatSalaryRange, type Job } from "@baydar/shared";
import { Badge, Chip, Surface, nativeTokens } from "@baydar/ui-native";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

import { useStyles } from "./detailStyles";

export function JobDescription({ job }: { job: Job }): JSX.Element {
  const styles = useStyles();
  const { t } = useTranslation();
  return (
    <Surface variant="card" padding="6">
      <Text style={styles.section}>{t("jobs.description")}</Text>
      <Text style={styles.body}>{job.description}</Text>
    </Surface>
  );
}

export function JobSkills({ job }: { job: Job }): JSX.Element | null {
  const styles = useStyles();
  const { t } = useTranslation();
  if (job.skillsRequired.length === 0) return null;
  return (
    <Surface variant="card" padding="6">
      <Text style={styles.section}>{t("jobs.skills")}</Text>
      {/* Was a hand-rolled View+Text pair carrying its own padding, radius and
          type — i.e. the kit's Chip, rebuilt out of the wrong primitives. */}
      <View style={styles.skillsRow}>
        {job.skillsRequired.map((s) => (
          <Chip key={s} size="sm">
            {s}
          </Chip>
        ))}
      </View>
    </Surface>
  );
}

/**
 * Pay, and the statutory-floor warning that qualifies it.
 *
 * Web has carried both on every candidate-facing job surface since the wage
 * work; mobile rendered neither, on a jobs board whose readers decide on
 * exactly this number. The floor is Council of Ministers Resolution No. 4
 * of 2021.
 */
export function JobPay({ job }: { job: Job }): JSX.Element | null {
  const styles = useStyles();
  const { t, i18n } = useTranslation();
  const salary = formatSalaryRange(
    job.salaryMin,
    job.salaryMax,
    job.salaryCurrency ?? "USD",
    i18n.language,
  );
  const below = belowMinimumWage(job);
  if (!salary && !below) return null;
  return (
    <View style={{ marginTop: nativeTokens.space[1], gap: nativeTokens.space[1] }}>
      {salary ? <Text style={styles.salary}>{salary}</Text> : null}
      {below ? (
        <View style={{ alignItems: "flex-start" }}>
          <Badge tone="warning" srLabel={t("jobs.belowMinimumSr")}>
            {t("jobs.belowMinimumBadge")}
          </Badge>
        </View>
      ) : null}
    </View>
  );
}
