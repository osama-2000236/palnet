import {
  ApplicationStatus,
  Company,
  cursorPage,
  EmployerApplicant,
} from "@baydar/shared";
import { Surface, nativeTokens } from "@baydar/ui-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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
  const { t } = useTranslation();
  const { slug, jobId } = useLocalSearchParams<{ slug: string; jobId: string }>();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [items, setItems] = useState<EmployerApplicant[]>([]);
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
    async (applicationId: string, status: ApplicationStatus): Promise<void> => {
      if (!companyId || !jobId) return;
      try {
        const updated = await apiFetch(
          `/companies/${companyId}/jobs/${jobId}/applicants/${applicationId}`,
          EmployerApplicant,
          { method: "PATCH", body: { status } },
        );
        setItems((arr) => arr.map((a) => (a.id === updated.id ? updated : a)));
      } catch (e) {
        setError(apiErrorMessage(t, e));
      }
    },
    [companyId, jobId, t],
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: nativeTokens.color.surfaceMuted }}>
      <Stack.Screen options={{ title: t("employer.applicantsTitle"), headerShown: true }} />
      <FlatList
        contentContainerStyle={{ padding: nativeTokens.space[4], gap: nativeTokens.space[3] }}
        data={items}
        keyExtractor={(a) => a.id}
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
          <Surface variant="card" padding="4">
            <Text
              style={{
                color: nativeTokens.color.ink,
                fontFamily: nativeTokens.type.family.sans,
                fontSize: nativeTokens.type.scale.h3.size,
                fontWeight: "700",
              }}
            >
              {item.applicant.profile
                ? `${item.applicant.profile.firstName} ${item.applicant.profile.lastName}`.trim()
                : item.applicant.email}
            </Text>
            {item.applicant.profile?.headline ? (
              <Text
                style={{
                  color: nativeTokens.color.inkMuted,
                  fontSize: nativeTokens.type.scale.caption.size,
                  marginTop: nativeTokens.space[1],
                }}
              >
                {item.applicant.profile.headline}
              </Text>
            ) : null}
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: nativeTokens.space[2],
                marginTop: nativeTokens.space[3],
              }}
            >
              {STATUSES.map((s) => (
                <Pressable
                  key={s}
                  onPress={() => void changeStatus(item.id, s)}
                  style={{
                    paddingVertical: nativeTokens.space[1],
                    paddingHorizontal: nativeTokens.space[3],
                    borderRadius: nativeTokens.radius.full,
                    backgroundColor:
                      item.status === s ? nativeTokens.color.brand500 : nativeTokens.color.surfaceMuted,
                  }}
                >
                  <Text
                    style={{
                      color:
                        item.status === s ? nativeTokens.color.inkInverse : nativeTokens.color.ink,
                      fontSize: nativeTokens.type.scale.caption.size,
                      fontWeight: "600",
                    }}
                  >
                    {t(`employer.status.${s}`)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Surface>
        )}
      />
    </SafeAreaView>
  );
}
