// Mobile job detail. Hero with company logo + title + meta + apply button.
// Applied badge flips optimistically on press, rolls back on failure.

import { ApplyToJobBody, Bookmark, BookmarkType, Job as JobSchema, type Job } from "@baydar/shared";
import { AppHeader, Button, Icon, Input, Surface, nativeTokens } from "@baydar/ui-native";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { StateMessage } from "@/components/StateMessage";
import { apiCall, apiFetch } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-errors";
import { track } from "@/lib/analytics";
import { successHaptic, tapHaptic } from "@/lib/haptics";
import { getAccessToken } from "@/lib/session";

import { styles } from "../_jobs/detailStyles";

export default function JobDetailScreen(): JSX.Element {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ id: string }>();
  const jobId = typeof params.id === "string" ? params.id : "";

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applyOpen, setApplyOpen] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

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
      } catch (caught) {
        if (!cancelled) setError(apiErrorMessage(t, caught));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return (): void => {
      cancelled = true;
    };
  }, [jobId, t]);

  const openApply = useCallback(() => {
    setSubmitError(null);
    setCoverLetter("");
    setApplyOpen(true);
  }, []);

  const submitApply = useCallback(async (): Promise<void> => {
    if (!job || submitting) return;
    const token = await getAccessToken();
    if (!token) return;
    setSubmitError(null);
    const trimmed = coverLetter.trim();
    const parsed = ApplyToJobBody.safeParse(trimmed ? { coverLetter: trimmed } : {});
    if (!parsed.success) {
      setSubmitError(t("common.genericError"));
      return;
    }
    setSubmitting(true);
    try {
      tapHaptic();
      await apiCall(`/jobs/${job.id}/apply`, {
        method: "POST",
        token,
        body: parsed.data,
      });
      setJob((j) => (j ? { ...j, viewer: { ...j.viewer, hasApplied: true } } : j));
      setApplyOpen(false);
      track("jobs.apply", { jobId: job.id });
      successHaptic();
    } catch (caught) {
      setSubmitError(apiErrorMessage(t, caught));
    } finally {
      setSubmitting(false);
    }
  }, [job, submitting, coverLetter, t]);

  const toggleSave = useCallback(async (): Promise<void> => {
    if (!job || saveBusy) return;
    const token = await getAccessToken();
    if (!token) return;
    const bookmarkId = job.viewer.bookmarkId;
    setSaveBusy(true);
    setJob({
      ...job,
      viewer: { ...job.viewer, bookmarkId: bookmarkId ? null : "pending_bookmark" },
    });
    try {
      tapHaptic();
      if (bookmarkId) {
        await apiCall(`/bookmarks/${bookmarkId}`, { method: "DELETE", token });
        successHaptic();
        return;
      }
      const created = await apiFetch("/bookmarks", Bookmark, {
        method: "POST",
        token,
        body: { type: BookmarkType.JOB, targetId: job.id },
      });
      setJob((current) =>
        current ? { ...current, viewer: { ...current.viewer, bookmarkId: created.id } } : current,
      );
      successHaptic();
    } catch {
      setJob(job);
    } finally {
      setSaveBusy(false);
    }
  }, [job, saveBusy]);

  if (loading) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={{ padding: nativeTokens.space[4] }}>
          <StateMessage message={t("common.loading")} role="text" />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !job) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={{ padding: nativeTokens.space[4] }}>
          <StateMessage
            message={error ?? t("jobs.notFound")}
            actionLabel={t("common.back")}
            onAction={() => router.back()}
          />
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
      <ScrollView
        contentContainerStyle={{ padding: nativeTokens.space[4], gap: nativeTokens.space[3] }}
      >
        <AppHeader
          title={t("jobs.title")}
          compact
          trailing={
            <Button variant="ghost" size="sm" onPress={() => router.back()}>
              {t("common.back")}
            </Button>
          }
        />

        <Surface variant="hero" padding="6">
          <View style={{ flexDirection: "row", gap: nativeTokens.space[3] }}>
            <View style={styles.logoBox}>
              {job.company.logoUrl ? (
                <Image
                  source={{ uri: job.company.logoUrl }}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="cover"
                  cachePolicy="memory-disk"
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
          <View style={{ marginTop: nativeTokens.space[3], gap: nativeTokens.space[2] }}>
            <Button
              variant="secondary"
              onPress={() => void toggleSave()}
              loading={saveBusy}
              accessibilityLabel={job.viewer.bookmarkId ? t("jobs.saved") : t("jobs.save")}
              leading={<Icon name="bookmark" size={16} color={nativeTokens.color.ink} />}
            >
              {job.viewer.bookmarkId ? t("jobs.saved") : t("jobs.save")}
            </Button>
            {job.viewer.hasApplied ? (
              <View style={styles.appliedBadge}>
                <Text style={styles.appliedBadgeText}>✓ {t("jobs.appliedBadge")}</Text>
              </View>
            ) : (
              <Button variant="accent" onPress={openApply} accessibilityLabel={t("jobs.apply")}>
                {t("jobs.apply")}
              </Button>
            )}
          </View>
        </Surface>

        {applyOpen && !job.viewer.hasApplied ? (
          <Surface variant="card" padding="6">
            <View style={{ gap: nativeTokens.space[3] }}>
              <View style={{ gap: nativeTokens.space[1] }}>
                <Text style={styles.section}>{t("jobs.applyTitle", { title: job.title })}</Text>
                <Text style={styles.muted}>
                  {t("jobs.applySubtitle", { company: job.company.name })}
                </Text>
              </View>

              <View style={{ gap: nativeTokens.space[1] }}>
                <Text style={styles.fieldLabel}>{t("jobs.coverLetterLabel")}</Text>
                <Input
                  fullWidth
                  value={coverLetter}
                  onChangeText={setCoverLetter}
                  placeholder={t("jobs.coverLetterPlaceholder")}
                  multiline
                  maxLength={8000}
                  inputStyle={styles.coverLetterInput}
                />
                <Text style={styles.hint}>{t("jobs.coverLetterHint")}</Text>
              </View>

              {submitError ? (
                <View accessibilityRole="alert" style={styles.inlineError}>
                  <Text style={styles.inlineErrorText}>{submitError}</Text>
                </View>
              ) : null}

              <View style={styles.formActions}>
                <Button variant="ghost" onPress={() => setApplyOpen(false)} disabled={submitting}>
                  {t("common.cancel")}
                </Button>
                <Button
                  variant="accent"
                  onPress={() => void submitApply()}
                  loading={submitting}
                  testID="job-apply-submit"
                  leading={<Icon name="send" size={16} color={nativeTokens.color.inkInverse} />}
                >
                  {t("jobs.submitApplication")}
                </Button>
              </View>
            </View>
          </Surface>
        ) : null}

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
