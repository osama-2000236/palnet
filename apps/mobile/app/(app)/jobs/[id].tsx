// Mobile job detail. Hero with company logo + title + meta + apply button.
// Applied badge flips optimistically on press, rolls back on failure.

import {
  ApplyToJobBody,
  Bookmark,
  BookmarkType,
  Job as JobSchema,
  jobSource,
  jobSourceInitial,
  type Job,
} from "@baydar/shared";
import {
  Alert,
  AppBand,
  Button,
  Chip,
  Icon,
  Surface,
  nativeTokens,
  useThemeTokens,
} from "@baydar/ui-native";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, Share, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { NeverPayBanner } from "@/components/NeverPayBanner";
import { DetailScreenSkeleton } from "@/components/ScreenSkeleton";
import { apiCall, apiFetch, ApiRequestError } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-errors";
import { track } from "@/lib/analytics";
import { successHaptic, tapHaptic } from "@/lib/haptics";
import { WEB_ORIGIN } from "@/lib/linking";
import { getAccessToken } from "@/lib/session";

import { ApplyCard } from "@/screens/jobs/ApplyCard";
import { useStyles } from "@/screens/jobs/detailStyles";
import { ApplicationRail } from "@/screens/jobs/ApplicationRail";
import { JobDescription, JobPay, JobSkills } from "@/screens/jobs/JobSections";

export default function JobDetailScreen(): JSX.Element {
  const c = useThemeTokens().color;
  const styles = useStyles();
  const { t, i18n } = useTranslation();
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

  const loadJob = useCallback(async (): Promise<void> => {
    const token = await getAccessToken();
    if (!token || !jobId) return;
    setLoading(true);
    setError(null);
    try {
      const j = await apiFetch(`/jobs/${jobId}`, JobSchema, { token });
      setJob(j);
    } catch (caught) {
      // A job that is gone stays gone; NOT_FOUND leaves `error` null so the
      // branch below offers a way back rather than a retry that cannot succeed.
      if (!(caught instanceof ApiRequestError && caught.code === "NOT_FOUND")) {
        setError(apiErrorMessage(t, caught));
      }
    } finally {
      setLoading(false);
    }
  }, [jobId, t]);

  useEffect(() => {
    void loadJob();
  }, [loadJob]);

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

  // OS share sheet (WhatsApp lands first for our users). Links to the PUBLIC
  // share page so recipients without an account still see the role.
  const shareJob = useCallback(async (): Promise<void> => {
    if (!job) return;
    const locale = i18n.language.startsWith("ar") ? "ar-PS" : "en";
    const url = `${WEB_ORIGIN}/${locale}/j/${job.id}`;
    await Share.share({ message: `${job.title} — ${jobSource(job).name}\n${url}` }).catch(
      () => undefined,
    );
  }, [job, i18n.language]);

  if (loading) {
    return (
      <SafeAreaView style={styles.screen}>
        <DetailScreenSkeleton />
      </SafeAreaView>
    );
  }

  if (error || !job) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={{ padding: nativeTokens.space[4], gap: nativeTokens.space[3] }}>
          {/* Lockstep with web: only a failure gets a retry; back stays for both. */}
          <Alert
            body={error ?? t("jobs.notFound")}
            kind={error ? "danger" : "info"}
            cta={error ? t("common.retry") : t("common.back")}
            onAction={error ? () => void loadJob() : () => router.back()}
          />
          {error ? (
            <Button variant="ghost" onPress={() => router.back()}>
              {t("common.back")}
            </Button>
          ) : null}
        </View>
      </SafeAreaView>
    );
  }

  // A job posted by an individual has no company — show the person instead.
  const source = jobSource(job);
  const metaParts = [
    job.city,
    t(`jobs.locationLabels.${job.locationMode}`),
    t(`jobs.typeLabels.${job.type}`),
  ].filter(Boolean) as string[];

  return (
    <SafeAreaView edges={["left", "right", "bottom"]} style={styles.screen}>
      <AppBand
        title={t("jobs.title")}
        density="compact"
        trailing={
          <Button variant="ghost" size="sm" onPress={() => router.back()}>
            {t("common.back")}
          </Button>
        }
      />
      <ScrollView contentContainerStyle={styles.scrollBody}>
        <Surface variant="hero" padding="6">
          <View style={{ flexDirection: "row", gap: nativeTokens.space[3] }}>
            <View style={styles.logoBox}>
              {source.imageUrl ? (
                <Image
                  source={{ uri: source.imageUrl }}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
              ) : (
                <Text style={styles.logoFallback}>{jobSourceInitial(source)}</Text>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title} numberOfLines={2}>
                {job.title}
              </Text>
              <Text style={styles.muted}>{source.name}</Text>
              <Text style={[styles.muted, { marginTop: nativeTokens.space[1] }]}>
                {metaParts.join(" · ")}
              </Text>
              <JobPay job={job} />
            </View>
          </View>
          <View style={{ marginTop: nativeTokens.space[3], gap: nativeTokens.space[2] }}>
            {/* Secondary actions side-by-side; primary apply keeps full width. */}
            <View style={{ flexDirection: "row", gap: nativeTokens.space[2] }}>
              <View style={{ flex: 1 }}>
                <Button
                  fullWidth
                  variant="secondary"
                  onPress={() => void toggleSave()}
                  loading={saveBusy}
                  accessibilityLabel={job.viewer.bookmarkId ? t("jobs.saved") : t("jobs.save")}
                  leading={<Icon name="bookmark" size={16} color={c.ink} />}
                >
                  {job.viewer.bookmarkId ? t("jobs.saved") : t("jobs.save")}
                </Button>
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  fullWidth
                  variant="secondary"
                  onPress={() => void shareJob()}
                  accessibilityLabel={t("jobs.share.share")}
                  leading={<Icon name="share" size={16} color={c.ink} />}
                >
                  {t("jobs.share.share")}
                </Button>
              </View>
            </View>
            {job.viewer.hasApplied ? (
              // The badge is the label; the rail below is the position.
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

        <ApplicationRail job={job} />
        <NeverPayBanner />

        {applyOpen && !job.viewer.hasApplied ? (
          <ApplyCard
            title={job.title}
            company={source.name}
            coverLetter={coverLetter}
            onChangeCoverLetter={setCoverLetter}
            submitting={submitting}
            submitError={submitError}
            onCancel={() => setApplyOpen(false)}
            onSubmit={() => void submitApply()}
          />
        ) : null}

        <JobDescription job={job} />
        <JobSkills job={job} />
      </ScrollView>
    </SafeAreaView>
  );
}
