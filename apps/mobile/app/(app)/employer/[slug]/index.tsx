import { Company, cursorPage, EmployerJob } from "@baydar/shared";
import { Surface, nativeTokens } from "@baydar/ui-native";
import { Link, Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, Pressable, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { apiFetch, apiFetchPage } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-errors";

const JobsPage = cursorPage(EmployerJob);

export default function CompanyJobsScreen(): JSX.Element {
  const { t } = useTranslation();
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
    <SafeAreaView style={{ flex: 1, backgroundColor: nativeTokens.color.surfaceMuted }}>
      <Stack.Screen options={{ title: t("employer.jobsTitle"), headerShown: true }} />
      <FlatList
        contentContainerStyle={{ padding: nativeTokens.space[4], gap: nativeTokens.space[3] }}
        data={jobs}
        keyExtractor={(j) => j.id}
        refreshing={loading}
        onRefresh={load}
        ListEmptyComponent={
          error ? (
            <Text style={{ color: nativeTokens.color.danger }}>{error}</Text>
          ) : loading ? (
            <Text style={{ color: nativeTokens.color.inkMuted }}>{t("common.loading")}</Text>
          ) : (
            <Surface variant="card" padding="4">
              <Text style={{ color: nativeTokens.color.ink }}>{t("employer.applicantsEmpty")}</Text>
            </Surface>
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
              <Surface variant="card" padding="4">
                <Text
                  style={{
                    color: nativeTokens.color.ink,
                    fontFamily: nativeTokens.type.family.sans,
                    fontSize: nativeTokens.type.scale.h3.size,
                    fontWeight: "700",
                  }}
                >
                  {item.title}
                </Text>
                <Text
                  style={{
                    color: nativeTokens.color.inkMuted,
                    fontSize: nativeTokens.type.scale.caption.size,
                    marginTop: nativeTokens.space[1],
                  }}
                >
                  {t("employer.applicantCount", { count: item.applicantCount })}
                </Text>
              </Surface>
            </Pressable>
          </Link>
        )}
      />
    </SafeAreaView>
  );
}
