import {
  belowMinimumWage,
  formatSalaryRange,
  jobSource,
  jobSourceInitial,
  type Job,
} from "@baydar/shared";
import {
  Badge,
  Icon,
  RecordCard,
  nativeTokens,
  useThemeTokens,
  type NativeTheme,
} from "@baydar/ui-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { memo, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";

export const JobRow = memo(function JobRow({
  job,
  saving,
  onToggleSave,
}: {
  job: Job;
  saving?: boolean;
  onToggleSave?: () => void;
}): JSX.Element {
  const c = useThemeTokens().color;
  const styles = useStyles();
  const { t, i18n } = useTranslation();
  // Pay rides the meta line, the way web's row carries it. Leaving it off was
  // not a layout call: mobile showed no wage anywhere, list or detail, on a
  // jobs board whose readers choose on exactly this number.
  const range = formatSalaryRange(
    job.salaryMin,
    job.salaryMax,
    job.salaryCurrency ?? "USD",
    i18n.language,
  );
  const salary = range
    ? job.salaryMin && job.salaryMax
      ? range
      : `${t(job.salaryMin ? "jobs.from" : "jobs.upTo")} ${range}`
    : null;
  const metaParts = [
    job.city,
    t(`jobs.locationLabels.${job.locationMode}`),
    t(`jobs.typeLabels.${job.type}`),
    salary,
  ].filter(Boolean) as string[];
  const saved = job.viewer.bookmarkId !== null;
  // A job posted by an individual has no company — show the person instead.
  const source = jobSource(job);

  return (
    <RecordCard
      variant="row"
      title={job.title}
      subtitle={source.name}
      meta={metaParts.join(" · ")}
      onPress={() => router.push({ pathname: "/(app)/jobs/[id]", params: { id: job.id } })}
      accessibilityLabel={`${job.title} - ${source.name}`}
      testID={`job-row-${job.id}`}
      leading={
        <View style={styles.logoBox}>
          {source.imageUrl ? (
            <Image
              source={{ uri: source.imageUrl }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          ) : (
            <Text style={styles.logoFallback}>{jobSourceInitial(source)}</Text>
          )}
        </View>
      }
      trailing={
        <View style={styles.trailing}>
          {onToggleSave ? (
            <Pressable
              onPress={onToggleSave}
              disabled={saving}
              accessibilityRole="button"
              accessibilityLabel={saved ? t("jobs.saved") : t("jobs.save")}
              accessibilityState={{ selected: saved, disabled: saving }}
              hitSlop={8}
              style={({ pressed }) => [
                styles.saveButton,
                saved ? styles.saveButtonActive : null,
                pressed && !saving ? styles.pressed : null,
                saving ? styles.disabled : null,
              ]}
            >
              <Icon name="bookmark" size={18} color={saved ? c.brand700 : c.inkMuted} />
            </Pressable>
          ) : null}
          {job.viewer.hasApplied ? (
            <View style={styles.appliedBadge}>
              <Text style={styles.appliedText}>{t("jobs.appliedBadge")}</Text>
            </View>
          ) : null}
          {/* Statutory floor, Council of Ministers Resolution No. 4 of 2021 —
              shown to the employer writing the job since #140 and to nobody
              reading one. Web has carried it on every candidate surface. */}
          {belowMinimumWage(job) ? (
            <Badge tone="warning" srLabel={t("jobs.belowMinimumSr")}>
              {t("jobs.belowMinimumBadge")}
            </Badge>
          ) : null}
        </View>
      }
    />
  );
}, areEqual);

function areEqual(
  prev: { job: Job; saving?: boolean; onToggleSave?: () => void },
  next: { job: Job; saving?: boolean; onToggleSave?: () => void },
): boolean {
  return (
    prev.job.id === next.job.id &&
    prev.job.createdAt === next.job.createdAt &&
    prev.job.viewer.hasApplied === next.job.viewer.hasApplied &&
    prev.job.viewer.bookmarkId === next.job.viewer.bookmarkId &&
    prev.saving === next.saving
  );
}

function makeStyles(c: NativeTheme["color"]) {
  return StyleSheet.create({
    logoBox: {
      width: nativeTokens.space[12],
      height: nativeTokens.space[12],
      borderRadius: nativeTokens.radius.md,
      backgroundColor: c.surfaceSunken,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    logoFallback: {
      color: c.inkMuted,
      fontWeight: "600",
      fontFamily: nativeTokens.type.family.sans,
    },
    trailing: {
      alignItems: "flex-end",
      gap: nativeTokens.space[2],
    },
    saveButton: {
      width: nativeTokens.space[9],
      height: nativeTokens.space[9],
      borderRadius: nativeTokens.radius.md,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.surfaceSubtle,
    },
    saveButtonActive: {
      backgroundColor: c.brand50,
    },
    appliedBadge: {
      alignSelf: "flex-start",
      paddingHorizontal: nativeTokens.space[2],
      paddingVertical: nativeTokens.space[1],
      borderRadius: nativeTokens.radius.full,
      backgroundColor: c.successSoft,
    },
    appliedText: {
      color: c.success,
      fontSize: nativeTokens.type.scale.caption.size,
      fontWeight: "700",
      fontFamily: nativeTokens.type.family.sans,
    },
    pressed: {
      opacity: 0.84,
    },
    disabled: {
      opacity: 0.5,
    },
  });
}

function useStyles() {
  const c = useThemeTokens().color;
  return useMemo(() => makeStyles(c), [c]);
}
