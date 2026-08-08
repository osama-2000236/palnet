// The two static sections below the job hero. Lifted out of the screen so the
// route file stays under the 300-LOC cap; no behaviour change.

import type { Job } from "@baydar/shared";
import { Chip, Surface } from "@baydar/ui-native";
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
