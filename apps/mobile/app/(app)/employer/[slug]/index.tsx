import { Company, cursorPage, EmployerJob } from "@baydar/shared";
import {
  AppHeader,
  Button,
  EmptyState,
  RecordCard,
  RecordCardSkeleton,
  nativeTokens,
} from "@baydar/ui-native";
import { Link, Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { StateMessage } from "@/components/StateMessage";
import { apiFetch, apiFetchPage } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-errors";

const JobsPage = cursorPage(EmployerJob);

export default function CompanyJobsScreen(): JSX.Element {
  const { t } = useTranslation();
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [jobs, setJobs] = useState<EmployerJob[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
    if (!companyId) return;
    setLoading(true);
    try {
      const page = await apiFetchPage(
        `/companies/${companyId}/jobs?status=active&limit=20`,
        JobsPage,
      );
      setJobs(page.data);
    } catch (e) {
      setError(apiErrorMessage(t, e));
    } finally {
      setLoading(false);
    }
  }, [companyId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <SafeAreaView style={styles.screen}>
      <Stack.Screen options={{ title: t("employer.jobsTitle"), headerShown: false }} />
      <View style={styles.content}>
        <AppHeader title={t("employer.jobsTitle")} compact />
        <View style={styles.actions}>
          <Button
            variant="primary"
            size="sm"
            onPress={() =>
              router.push({
                pathname: "/(app)/employer/[slug]/jobs/new",
                params: { slug },
              } as never)
            }
            accessibilityLabel={t("employer.newJob.title")}
          >
            {t("employer.newJob.title")}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onPress={() =>
              router.push({
                pathname: "/(app)/employer/[slug]/billing",
                params: { slug },
              } as never)
            }
            accessibilityLabel={t("billing.employer.billingLink")}
          >
            {t("billing.employer.billingLink")}
          </Button>
        </View>
        <FlatList
          contentContainerStyle={styles.listContent}
          data={jobs}
          keyExtractor={(j) => j.id}
          refreshing={loading}
          onRefresh={load}
          ListEmptyComponent={
            error ? (
              <StateMessage
                message={error}
                actionLabel={t("common.retry")}
                busy={loading}
                onAction={() => void load()}
              />
            ) : loading || !companyId ? (
              <View style={styles.skeletonStack}>
                <RecordCardSkeleton />
                <RecordCardSkeleton />
              </View>
            ) : (
              <EmptyState motif="jobs" title={t("employer.jobsEmpty")} />
            )
          }
          renderItem={({ item }) => (
            <Link
              href={{
                pathname: "/(app)/employer/[slug]/[jobId]",
                params: { slug, jobId: item.id },
              }}
              asChild
            >
              <Pressable>
                <RecordCard
                  title={item.title}
                  subtitle={`${item.type} · ${item.locationMode}`}
                  meta={t("employer.applicantCount", { count: item.applicantCount })}
                />
              </Pressable>
            </Link>
          )}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: nativeTokens.color.surfaceMuted,
  },
  content: {
    flex: 1,
    paddingHorizontal: nativeTokens.space[4],
    paddingTop: nativeTokens.space[3],
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingBottom: nativeTokens.space[3],
  },
  listContent: {
    gap: nativeTokens.space[3],
    paddingBottom: nativeTokens.space[6],
  },
  skeletonStack: {
    gap: nativeTokens.space[3],
  },
});
