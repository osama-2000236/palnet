import { type Job } from "@baydar/shared";
import { Surface, nativeTokens } from "@baydar/ui-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { memo } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";

export const JobRow = memo(function JobRow({ job }: { job: Job }): JSX.Element {
  const { t } = useTranslation();
  const metaParts = [
    job.city,
    t(`jobs.locationLabels.${job.locationMode}`),
    t(`jobs.typeLabels.${job.type}`),
  ].filter(Boolean) as string[];

  return (
    <Pressable
      onPress={() => router.push({ pathname: "/(app)/jobs/[id]", params: { id: job.id } })}
      accessibilityRole="link"
      accessibilityLabel={`${job.title} - ${job.company.name}`}
      testID={`job-row-${job.id}`}
    >
      <Surface variant="card" padding="4">
        <View style={styles.row}>
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

          <View style={styles.content}>
            <View style={styles.titleRow}>
              <View style={styles.titleText}>
                <Text numberOfLines={1} style={styles.title}>
                  {job.title}
                </Text>
                <Text numberOfLines={1} style={styles.company}>
                  {job.company.name}
                </Text>
              </View>
              {job.viewer.hasApplied ? (
                <View style={styles.appliedBadge}>
                  <Text style={styles.appliedText}>{t("jobs.appliedBadge")}</Text>
                </View>
              ) : null}
            </View>

            <Text style={styles.meta}>{metaParts.join(" . ")}</Text>
          </View>
        </View>
      </Surface>
    </Pressable>
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
  row: {
    flexDirection: "row",
    gap: nativeTokens.space[3],
  },
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
  content: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: nativeTokens.space[2],
  },
  titleText: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: nativeTokens.color.ink,
    fontSize: nativeTokens.type.scale.h3.size,
    lineHeight: nativeTokens.type.scale.h3.line,
    fontWeight: "600",
    fontFamily: nativeTokens.type.family.sans,
  },
  company: {
    color: nativeTokens.color.inkMuted,
    fontSize: nativeTokens.type.scale.small.size,
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
  meta: {
    marginTop: nativeTokens.space[1],
    color: nativeTokens.color.inkMuted,
    fontSize: nativeTokens.type.scale.small.size,
    fontFamily: nativeTokens.type.family.sans,
  },
});
