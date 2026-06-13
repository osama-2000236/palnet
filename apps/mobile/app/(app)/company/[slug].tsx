import {
  Company,
  cursorPage,
  Job as JobSchema,
  type Company as CompanyDto,
  type Job,
} from "@baydar/shared";
import { Button, Surface, nativeTokens } from "@baydar/ui-native";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { JobRow } from "@/components/rows/JobRow";
import { StateMessage } from "@/components/StateMessage";
import { apiFetch, apiFetchPage } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-errors";

const JobsPage = cursorPage(JobSchema);

export default function CompanyScreen(): JSX.Element {
  const { t } = useTranslation();
  const { slug } = useLocalSearchParams<{ slug: string }>();

  const [company, setCompany] = useState<CompanyDto | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    if (!slug) return;
    setError(null);
    try {
      const nextCompany = await apiFetch(`/companies/${encodeURIComponent(slug)}`, Company);
      const jobsPage = await apiFetchPage(`/jobs?companyId=${nextCompany.id}&limit=10`, JobsPage);
      setCompany(nextCompany);
      setJobs(jobsPage.data);
    } catch (caught) {
      setError(apiErrorMessage(t, caught));
    } finally {
      setLoading(false);
    }
  }, [slug, t]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <SafeAreaView style={styles.centerScreen}>
        <StateMessage message={t("common.loading")} role="text" />
      </SafeAreaView>
    );
  }

  if (error || !company) {
    return (
      <SafeAreaView style={styles.centerScreen}>
        <StateMessage
          message={t("company.loadError")}
          tone="error"
          actionLabel={t("common.retry")}
          onAction={() => void load()}
        />
      </SafeAreaView>
    );
  }

  const location = [company.city, company.country].filter(Boolean).join(", ");

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollBody}>
        <Surface variant="hero" padding="5" style={styles.hero}>
          <View style={styles.heroRow}>
            <View style={styles.logoBox}>
              {company.logoUrl ? (
                <Image
                  source={{ uri: company.logoUrl }}
                  style={StyleSheet.absoluteFill}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
              ) : (
                <Text style={styles.logoFallback}>{(company.name[0] ?? "?").toUpperCase()}</Text>
              )}
            </View>
            <View style={styles.heroText}>
              <Text accessibilityRole="header" style={styles.name}>
                {company.name}
                {company.verified ? (
                  <Text style={styles.verified}>{`  ${t("company.verified")}`}</Text>
                ) : null}
              </Text>
              {company.tagline ? <Text style={styles.tagline}>{company.tagline}</Text> : null}
              <Text style={styles.meta}>
                {[company.industry, location].filter(Boolean).join(" · ")}
              </Text>
            </View>
          </View>
          {company.website ? (
            <Button
              variant="secondary"
              size="sm"
              onPress={() => company.website && void Linking.openURL(company.website)}
              accessibilityLabel={t("company.visitWebsite")}
            >
              {t("company.visitWebsite")}
            </Button>
          ) : null}
        </Surface>

        {company.about ? (
          <Surface variant="flat" padding="5" style={styles.section}>
            <Text style={styles.sectionTitle}>{t("company.about")}</Text>
            <Text style={styles.bodyText}>{company.about}</Text>
          </Surface>
        ) : null}

        <Surface variant="flat" padding="5" style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t("company.openJobs")}</Text>
            {jobs.length > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                onPress={() =>
                  router.push({
                    pathname: "/(app)/jobs",
                    params: { companyId: company.id, company: company.name },
                  } as never)
                }
                accessibilityLabel={t("company.viewAllJobs")}
              >
                {t("company.viewAllJobs")}
              </Button>
            ) : null}
          </View>
          {jobs.length === 0 ? (
            <Text style={styles.bodyText}>{t("company.noJobs")}</Text>
          ) : (
            <View style={styles.jobList}>
              {jobs.map((job) => (
                <JobRow key={job.id} job={job} />
              ))}
            </View>
          )}
        </Surface>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: nativeTokens.color.surfaceMuted,
  },
  centerScreen: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: nativeTokens.color.surfaceMuted,
    padding: nativeTokens.space[4],
  },
  scrollBody: {
    padding: nativeTokens.space[4],
    gap: nativeTokens.space[4],
  },
  hero: {
    gap: nativeTokens.space[3],
  },
  heroRow: {
    flexDirection: "row",
    gap: nativeTokens.space[3],
  },
  logoBox: {
    width: nativeTokens.space[12],
    height: nativeTokens.space[12],
    borderRadius: nativeTokens.radius.lg,
    backgroundColor: nativeTokens.color.surfaceSunken,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  logoFallback: {
    color: nativeTokens.color.ink,
    fontWeight: "800",
    fontSize: nativeTokens.type.scale.h2.size,
    fontFamily: nativeTokens.type.family.sans,
  },
  heroText: {
    flex: 1,
    gap: nativeTokens.space[1],
  },
  name: {
    color: nativeTokens.color.ink,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.h2.size,
    lineHeight: nativeTokens.type.scale.h2.line,
    fontWeight: "800",
  },
  verified: {
    color: nativeTokens.color.brand700,
    fontSize: nativeTokens.type.scale.small.size,
    fontWeight: "700",
  },
  tagline: {
    color: nativeTokens.color.inkMuted,
    fontFamily: nativeTokens.type.family.body,
    fontSize: nativeTokens.type.scale.small.size,
    lineHeight: nativeTokens.type.scale.small.line,
  },
  meta: {
    color: nativeTokens.color.inkMuted,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.caption.size,
    lineHeight: nativeTokens.type.scale.caption.line,
  },
  section: {
    gap: nativeTokens.space[2],
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    color: nativeTokens.color.ink,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.h3.size,
    lineHeight: nativeTokens.type.scale.h3.line,
    fontWeight: "700",
  },
  bodyText: {
    color: nativeTokens.color.inkMuted,
    fontFamily: nativeTokens.type.family.body,
    fontSize: nativeTokens.type.scale.small.size,
    lineHeight: nativeTokens.type.scale.small.line,
  },
  jobList: {
    gap: nativeTokens.space[3],
  },
});
