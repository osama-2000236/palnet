// Mobile job detail. Hero with company logo + title + meta + apply button.
// Applied badge flips optimistically on press, rolls back on failure.

import { Job as JobSchema, type Job } from "@palnet/shared";
import { Button, Surface, nativeTokens } from "@palnet/ui-native";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from "react-native";

import { apiCall, apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/session";

export default function JobDetailScreen(): JSX.Element {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ id: string }>();
  const jobId = typeof params.id === "string" ? params.id : "";

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const token = await getAccessToken();
      if (!token || !jobId) return;
      setLoading(true);
      setError(null);
      try {
        const j = await apiFetch(`/jobs/${jobId}`, JobSchema, { token });
        if (!cancelled) setJob(j);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return (): void => {
      cancelled = true;
    };
  }, [jobId]);

  const handleApply = useCallback(async (): Promise<void> => {
    if (!job || applying) return;
    const token = await getAccessToken();
    if (!token) return;
    setApplying(true);
    setJob((j) => (j ? { ...j, viewer: { ...j.viewer, hasApplied: true } } : j));
    try {
      await apiCall(`/jobs/${job.id}/apply`, {
        method: "POST",
        token,
        body: {},
      });
    } catch {
      setJob((j) => (j ? { ...j, viewer: { ...j.viewer, hasApplied: false } } : j));
    } finally {
      setApplying(false);
    }
  }, [job, applying]);

  if (loading) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={{ padding: nativeTokens.space[4] }}>
          <ActivityIndicator />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !job) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={{ padding: nativeTokens.space[4] }}>
          <Surface variant="tinted" padding="6">
            <Text style={styles.muted}>{error ?? t("jobs.notFound")}</Text>
            <Pressable
              onPress={() => router.back()}
              style={{ marginTop: nativeTokens.space[2] }}
              accessibilityRole="button"
            >
              <Text style={{ color: nativeTokens.color.brand700, fontFamily: nativeTokens.type.family.sans }}>
                ← {t("jobs.title")}
              </Text>
            </Pressable>
          </Surface>
        </View>
      </SafeAreaView>
    );
  }

  const metaParts = [
    job.city,
    t(`jobs.locationLabels.${job.locationMode}`),
    t(`jobs.typeLabels.${job.type}`),
  ].filter(Boolean) as string[];

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={{ padding: nativeTokens.space[4], gap: nativeTokens.space[3] }}>
        <Pressable onPress={() => router.back()} accessibilityRole="button">
          <Text style={styles.muted}>← {t("jobs.title")}</Text>
        </Pressable>

        <Surface variant="hero" padding="6">
          <View style={{ flexDirection: "row", gap: nativeTokens.space[3] }}>
            <View style={styles.logoBox}>
              {job.company.logoUrl ? (
                <Image
                  source={{ uri: job.company.logoUrl }}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="cover"
                />
              ) : (
                <Text style={styles.logoFallback}>
                  {(job.company.name[0] ?? "?").toUpperCase()}
                </Text>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title} numberOfLines={2}>
                {job.title}
              </Text>
              <Text style={styles.muted}>{job.company.name}</Text>
              <Text style={[styles.muted, { marginTop: nativeTokens.space[1] }]}>
                {metaParts.join(" · ")}
              </Text>
            </View>
          </View>
          <View style={{ marginTop: nativeTokens.space[3] }}>
            {job.viewer.hasApplied ? (
              <View style={styles.appliedBadge}>
                <Text style={styles.appliedBadgeText}>✓ {t("jobs.appliedBadge")}</Text>
              </View>
            ) : (
              <Button
                variant="accent"
                onPress={handleApply}
                loading={applying}
                accessibilityLabel={t("jobs.apply")}
              >
                {t("jobs.apply")}
              </Button>
            )}
          </View>
        </Surface>

        <Surface variant="card" padding="6">
          <Text style={styles.section}>{t("jobs.description")}</Text>
          <Text style={styles.body}>{job.description}</Text>
        </Surface>

        {job.skillsRequired.length > 0 ? (
          <Surface variant="card" padding="6">
            <Text style={styles.section}>{t("jobs.skills")}</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: nativeTokens.space[1] }}>
              {job.skillsRequired.map((s) => (
                <View key={s} style={styles.chip}>
                  <Text style={styles.chipText}>{s}</Text>
                </View>
              ))}
            </View>
          </Surface>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = {
  screen: { flex: 1, backgroundColor: nativeTokens.color.surfaceMuted },
  title: {
    color: nativeTokens.color.ink,
    fontSize: nativeTokens.type.scale.h1.size,
    lineHeight: nativeTokens.type.scale.h1.line,
    fontWeight: "700" as const,
    fontFamily: nativeTokens.type.family.sans,
  },
  section: {
    color: nativeTokens.color.ink,
    fontSize: nativeTokens.type.scale.h3.size,
    fontWeight: "600" as const,
    fontFamily: nativeTokens.type.family.sans,
    marginBottom: nativeTokens.space[2],
  },
  body: {
    color: nativeTokens.color.ink,
    fontSize: nativeTokens.type.scale.body.size,
    lineHeight: nativeTokens.type.scale.body.line,
    fontFamily: nativeTokens.type.family.body,
  },
  muted: {
    color: nativeTokens.color.inkMuted,
    fontSize: nativeTokens.type.scale.small.size,
    fontFamily: nativeTokens.type.family.sans,
  },
  logoBox: {
    width: 56,
    height: 56,
    borderRadius: nativeTokens.radius.md,
    backgroundColor: nativeTokens.color.surfaceSunken,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    overflow: "hidden" as const,
  },
  logoFallback: {
    color: nativeTokens.color.inkMuted,
    fontWeight: "600" as const,
    fontSize: 18,
    fontFamily: nativeTokens.type.family.sans,
  },
  appliedBadge: {
    alignSelf: "flex-start" as const,
    paddingHorizontal: nativeTokens.space[3],
    paddingVertical: nativeTokens.space[2],
    borderRadius: nativeTokens.radius.md,
    backgroundColor: nativeTokens.color.successSoft,
  },
  appliedBadgeText: {
    color: nativeTokens.color.success,
    fontSize: 13,
    fontWeight: "700" as const,
    fontFamily: nativeTokens.type.family.sans,
  },
  chip: {
    paddingHorizontal: nativeTokens.space[2],
    paddingVertical: 4,
    borderRadius: nativeTokens.radius.full,
    backgroundColor: nativeTokens.color.surfaceSubtle,
  },
  chipText: {
    color: nativeTokens.color.ink,
    fontSize: 12,
    fontFamily: nativeTokens.type.family.sans,
  },
};
