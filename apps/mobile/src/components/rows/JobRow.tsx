import { type Job } from "@baydar/shared";
import { Icon, RecordCard, nativeTokens } from "@baydar/ui-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { memo } from "react";
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
  const { t } = useTranslation();
  const metaParts = [
    job.city,
    t(`jobs.locationLabels.${job.locationMode}`),
    t(`jobs.typeLabels.${job.type}`),
  ].filter(Boolean) as string[];
  const saved = job.viewer.bookmarkId !== null;

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
              <Icon
                name="bookmark"
                size={18}
                color={saved ? nativeTokens.color.brand700 : nativeTokens.color.inkMuted}
              />
            </Pressable>
          ) : null}
          {job.viewer.hasApplied ? (
            <View style={styles.appliedBadge}>
              <Text style={styles.appliedText}>{t("jobs.appliedBadge")}</Text>
            </View>
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
    backgroundColor: nativeTokens.color.surfaceSubtle,
  },
  saveButtonActive: {
    backgroundColor: nativeTokens.color.brand50,
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
  pressed: {
    opacity: 0.84,
  },
  disabled: {
    opacity: 0.5,
  },
});
