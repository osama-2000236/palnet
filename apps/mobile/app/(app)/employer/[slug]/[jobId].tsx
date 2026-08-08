import {
  ApplicationStatus,
  Company,
  cursorPage,
  EmployerApplicant,
  rejectionSummary,
  type RejectionReason,
} from "@baydar/shared";
import {
  Alert,
  AppHeader,
  Chip,
  EmptyState,
  RecordCardSkeleton,
  Surface,
  nativeTokens,
  useThemeTokens,
  type NativeTheme,
} from "@baydar/ui-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { RejectSheet } from "@/components/RejectSheet";
import { apiFetch, apiFetchPage } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-errors";

const ApplicantsPage = cursorPage(EmployerApplicant);

const STATUSES: ApplicationStatus[] = [
  ApplicationStatus.SUBMITTED,
  ApplicationStatus.REVIEWING,
  ApplicationStatus.SHORTLISTED,
  ApplicationStatus.REJECTED,
  ApplicationStatus.HIRED,
];

export default function ApplicantsInboxScreen(): JSX.Element {
  const styles = useStyles();
  const { t } = useTranslation();
  const { slug, jobId } = useLocalSearchParams<{ slug: string; jobId: string }>();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [items, setItems] = useState<EmployerApplicant[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [rejectBusy, setRejectBusy] = useState(false);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      try {
        const c = await apiFetch(`/companies/${encodeURIComponent(slug)}`, Company);
        setCompanyId(c.id);
      } catch (e) {
        setError(apiErrorMessage(t, e));
      }
    })();
  }, [slug, t]);

  const load = useCallback(async () => {
    if (!companyId || !jobId) return;
    setLoading(true);
    try {
      const page = await apiFetchPage(
        `/companies/${companyId}/jobs/${jobId}/applicants?limit=20`,
        ApplicantsPage,
      );
      setItems(page.data);
    } catch (e) {
      setError(apiErrorMessage(t, e));
    } finally {
      setLoading(false);
    }
  }, [companyId, jobId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const changeStatus = useCallback(
    async (
      applicationId: string,
      status: ApplicationStatus,
      rejection?: { rejectionReason: RejectionReason; rejectionNote?: string },
    ): Promise<void> => {
      if (!companyId || !jobId) return;
      try {
        const updated = await apiFetch(
          `/companies/${companyId}/jobs/${jobId}/applicants/${applicationId}`,
          EmployerApplicant,
          { method: "PATCH", body: { status, ...rejection } },
        );
        setItems((arr) => arr.map((a) => (a.id === updated.id ? updated : a)));
      } catch (e) {
        setError(apiErrorMessage(t, e));
      }
    },
    [companyId, jobId, t],
  );

  // REJECTED cannot be sent straight from the chip — the API requires a reason
  // with it, so the tap opens the sheet and the sheet sends.
  const onSelectStatus = useCallback(
    (applicationId: string, status: ApplicationStatus): void => {
      if (status === ApplicationStatus.REJECTED) {
        setRejecting(applicationId);
        return;
      }
      void changeStatus(applicationId, status);
    },
    [changeStatus],
  );

  const confirmReject = useCallback(
    async (reason: RejectionReason, note?: string): Promise<void> => {
      if (!rejecting) return;
      setRejectBusy(true);
      await changeStatus(rejecting, ApplicationStatus.REJECTED, {
        rejectionReason: reason,
        ...(note ? { rejectionNote: note } : {}),
      });
      setRejectBusy(false);
      setRejecting(null);
    },
    [rejecting, changeStatus],
  );

  return (
    <SafeAreaView style={styles.screen}>
      <Stack.Screen options={{ title: t("employer.applicantsTitle"), headerShown: false }} />
      <View style={styles.content}>
        <AppHeader title={t("employer.applicantsTitle")} compact />
        <FlatList
          contentContainerStyle={styles.listContent}
          data={items}
          keyExtractor={(a) => a.id}
          refreshing={loading}
          onRefresh={load}
          ListEmptyComponent={
            error ? (
              <Alert
                body={error}
                cta={t("common.retry")}
                busy={loading}
                onAction={() => void load()}
              />
            ) : loading || !companyId ? (
              <View style={styles.skeletonStack}>
                <RecordCardSkeleton variant="row" />
                <RecordCardSkeleton variant="row" />
              </View>
            ) : (
              <EmptyState motif="jobs" title={t("employer.applicantsEmpty")} />
            )
          }
          renderItem={({ item }) => (
            <Surface variant="card" padding="4" style={styles.applicantCard}>
              <Text selectable style={styles.applicantName}>
                {item.applicant.profile
                  ? `${item.applicant.profile.firstName} ${item.applicant.profile.lastName}`.trim()
                  : item.applicant.email}
              </Text>
              {item.applicant.profile?.headline ? (
                <Text selectable style={styles.applicantHeadline}>
                  {item.applicant.profile.headline}
                </Text>
              ) : null}
              <View style={styles.statusRow}>
                {STATUSES.map((s) => (
                  <Chip
                    key={s}
                    onPress={() => onSelectStatus(item.id, s)}
                    selected={item.status === s}
                    size="sm"
                    accessibilityLabel={t(`employer.status.${s}`)}
                  >
                    {t(`employer.status.${s}`)}
                  </Chip>
                ))}
              </View>
              {item.rejectionReason ? (
                <Text selectable style={styles.rejectionReason}>
                  {t("employer.reject.rejectedFor")}{" "}
                  {rejectionSummary(
                    t(`employer.rejectionReasons.${item.rejectionReason}`),
                    item.rejectionNote,
                  )}
                </Text>
              ) : null}
            </Surface>
          )}
        />
      </View>
      <RejectSheet
        open={rejecting !== null}
        busy={rejectBusy}
        onClose={() => setRejecting(null)}
        onConfirm={(reason, note) => void confirmReject(reason, note)}
      />
    </SafeAreaView>
  );
}

function makeStyles(c: NativeTheme["color"]) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: c.surfaceMuted,
    },
    content: {
      flex: 1,
      paddingHorizontal: nativeTokens.space[4],
      paddingTop: nativeTokens.space[3],
    },
    listContent: {
      gap: nativeTokens.space[3],
      paddingBottom: nativeTokens.space[6],
    },
    skeletonStack: {
      gap: nativeTokens.space[3],
    },
    applicantCard: {
      gap: nativeTokens.space[2],
    },
    applicantName: {
      color: c.ink,
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.h3.size,
      lineHeight: nativeTokens.type.scale.h3.line,
      fontWeight: "700",
      textAlign: "auto",
    },
    applicantHeadline: {
      color: c.inkMuted,
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.caption.size,
      lineHeight: nativeTokens.type.scale.caption.line,
      textAlign: "auto",
    },
    statusRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: nativeTokens.space[2],
      marginTop: nativeTokens.space[1],
    },
    rejectionReason: {
      color: c.inkMuted,
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.caption.size,
      lineHeight: nativeTokens.type.scale.caption.line,
      textAlign: "auto",
    },
  });
}

function useStyles() {
  const c = useThemeTokens().color;
  return useMemo(() => makeStyles(c), [c]);
}
