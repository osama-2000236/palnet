import { type Job } from "@baydar/shared";
import { RecordCard, nativeTokens } from "@baydar/ui-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { memo } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";

export const JobRow = memo(function JobRow({ job }: { job: Job }): JSX.Element {
  const { t } = useTranslation();
  const metaParts = [
    job.city,
    t(`jobs.locationLabels.${job.locationMode}`),
    t(`jobs.typeLabels.${job.type}`),
  ].filter(Boolean) as string[];

  return (
    <RecordCard
      title={job.title}
      subtitle={job.company.name}
      meta={metaParts.join(" . ")}
      onPress={() => router.push({ pathname: "/(app)/jobs/[id]", params: { id: job.id } })}
      accessibilityLabel={`${job.title} - ${job.company.name}`}
      testID={`job-row-${job.id}`}
      leading={
        <View style={styles.logoBox}>
          {job.company.logoUrl ? (
            <Image
              source={{ uri: job.company.logoUrl }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          ) : (
            <Text style={styles.logoFallback}>{(job.company.name[0] ?? "?").toUpperCase()}</Text>
          )}
        </View>
      }
      trailing={
        job.viewer.hasApplied ? (
          <View style={styles.appliedBadge}>
            <Text style={styles.appliedText}>{t("jobs.appliedBadge")}</Text>
          </View>
        ) : null
      }
    />
  );
}, areEqual);

function areEqual(prev: { job: Job }, next: { job: Job }): boolean {
  return (
    prev.job.id === next.job.id &&
    prev.job.createdAt === next.job.createdAt &&
    prev.job.viewer.hasApplied === next.job.viewer.hasApplied
  );
}

const styles = StyleSheet.create({
  logoBox: {
    width: nativeTokens.space[12],
    height: nativeTokens.space[12],
    borderRadius: nativeTokens.radius.md,
    backgroundColor: nativeTokens.color.surfaceSunken,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  logoFallback: {
    color: nativeTokens.color.inkMuted,
    fontWeight: "600",
    fontFamily: nativeTokens.type.family.sans,
  },
  appliedBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: nativeTokens.space[2],
    paddingVertical: nativeTokens.space[1],
    borderRadius: nativeTokens.radius.full,
    backgroundColor: nativeTokens.color.successSoft,
  },
  appliedText: {
    color: nativeTokens.color.success,
    fontSize: nativeTokens.type.scale.caption.size,
    fontWeight: "700",
    fontFamily: nativeTokens.type.family.sans,
  },
});
