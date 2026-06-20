// Publish-job screen — native twin of
// apps/web/src/app/[locale]/(app)/employer/[slug]/jobs/new/page.tsx. Closes the
// P1 mobile employer parity gap: a mobile owner can now publish a job.

import { Company, EmployerJob, JobLocationMode, JobType } from "@baydar/shared";
import {
  AppHeader,
  Button,
  Input,
  RadioGroup,
  Surface,
  nativeTokens,
} from "@baydar/ui-native";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { apiFetch } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-errors";
import { successHaptic } from "@/lib/haptics";
import { getAccessToken } from "@/lib/session";

type FormState = {
  title: string;
  description: string;
  type: JobType;
  locationMode: JobLocationMode;
  city: string;
  salaryMin: string;
  salaryMax: string;
  salaryCurrency: string;
};

const EMPTY: FormState = {
  title: "",
  description: "",
  type: "FULL_TIME",
  locationMode: "ONSITE",
  city: "",
  salaryMin: "",
  salaryMax: "",
  salaryCurrency: "ILS",
};

export default function NewJobScreen(): JSX.Element {
  const { t } = useTranslation();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [token, setToken] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void (async () => {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        router.replace("/(auth)/login");
        return;
      }
      setToken(accessToken);
      try {
        const company = await apiFetch(`/companies/${encodeURIComponent(slug)}`, Company, {
          token: accessToken,
        });
        setCompanyId(company.id);
      } catch (caught) {
        setError(apiErrorMessage(t, caught));
      }
    })();
  }, [slug, t]);

  const set = (key: keyof FormState) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async (): Promise<void> => {
    if (!token || !companyId) return;
    setError(null);
    setSubmitting(true);
    try {
      const body = {
        title: form.title,
        description: form.description,
        type: form.type,
        locationMode: form.locationMode,
        ...(form.city ? { city: form.city } : {}),
        country: "PS",
        ...(form.salaryMin ? { salaryMin: Number(form.salaryMin) } : {}),
        ...(form.salaryMax ? { salaryMax: Number(form.salaryMax) } : {}),
        salaryCurrency: form.salaryCurrency || "ILS",
        skillsRequired: [],
      };
      await apiFetch(`/companies/${companyId}/jobs`, EmployerJob, {
        method: "POST",
        token,
        body,
      });
      successHaptic();
      router.replace({ pathname: "/(app)/employer/[slug]", params: { slug } });
    } catch (caught) {
      setError(apiErrorMessage(t, caught));
      setSubmitting(false);
    }
  };

  const typeItems = Object.values(JobType).map((value) => ({
    value,
    label: t(`employer.jobType.${value}`),
  }));
  const locationItems = Object.values(JobLocationMode).map((value) => ({
    value,
    label: t(`employer.locationModeOptions.${value}`),
  }));

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.wrap}>
        <AppHeader
          title={t("employer.newJob.title")}
          compact
          trailing={
            <Button variant="ghost" size="sm" onPress={() => router.back()}>
              {t("common.back")}
            </Button>
          }
        />
        <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
          <Surface variant="card" padding="4">
            <View style={styles.fields}>
              <Field label={t("employer.newJob.fieldTitle")} required>
                <Input fullWidth size="lg" value={form.title} onChangeText={set("title")} />
              </Field>
              <Field label={t("employer.newJob.description")} required>
                <Input
                  fullWidth
                  size="lg"
                  multiline
                  numberOfLines={6}
                  inputStyle={styles.textarea}
                  value={form.description}
                  onChangeText={set("description")}
                />
              </Field>
              <RadioGroup
                label={t("employer.newJob.type")}
                items={typeItems}
                value={form.type}
                onValueChange={(v) => setForm((f) => ({ ...f, type: v as JobType }))}
              />
              <RadioGroup
                label={t("employer.newJob.locationMode")}
                items={locationItems}
                value={form.locationMode}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, locationMode: v as JobLocationMode }))
                }
              />
              <Field label={t("employer.newJob.city")}>
                <Input fullWidth size="lg" value={form.city} onChangeText={set("city")} />
              </Field>
              <View style={styles.row}>
                <Field label={t("employer.newJob.salaryMin")} style={styles.flex}>
                  <Input
                    fullWidth
                    size="lg"
                    keyboardType="number-pad"
                    value={form.salaryMin}
                    onChangeText={set("salaryMin")}
                  />
                </Field>
                <Field label={t("employer.newJob.salaryMax")} style={styles.flex}>
                  <Input
                    fullWidth
                    size="lg"
                    keyboardType="number-pad"
                    value={form.salaryMax}
                    onChangeText={set("salaryMax")}
                  />
                </Field>
                <Field label={t("employer.newJob.salaryCurrency")} style={styles.flex}>
                  <Input
                    fullWidth
                    size="lg"
                    autoCapitalize="characters"
                    maxLength={3}
                    value={form.salaryCurrency}
                    onChangeText={(v) => set("salaryCurrency")(v.toUpperCase())}
                  />
                </Field>
              </View>
            </View>
          </Surface>

          {error ? (
            <Surface variant="tinted" padding="3" accessibilityRole="alert">
              <Text style={styles.error}>{error}</Text>
            </Surface>
          ) : null}

          <Button
            variant="primary"
            size="lg"
            disabled={submitting || !companyId || !form.title || form.description.length < 30}
            loading={submitting}
            onPress={() => void submit()}
            accessibilityLabel={t("employer.newJob.submit")}
          >
            {submitting ? t("employer.newJob.submitting") : t("employer.newJob.submit")}
          </Button>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function Field({
  label,
  required,
  style,
  children,
}: {
  label: string;
  required?: boolean;
  style?: object;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <View style={[styles.field, style]}>
      <Text style={styles.label}>
        {label}
        {required ? " *" : ""}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: nativeTokens.color.surfaceMuted,
  },
  wrap: {
    flex: 1,
    gap: nativeTokens.space[3],
    paddingHorizontal: nativeTokens.space[4],
    paddingTop: nativeTokens.space[6],
  },
  list: {
    gap: nativeTokens.space[3],
    paddingBottom: nativeTokens.space[6],
  },
  fields: {
    gap: nativeTokens.space[3],
  },
  field: {
    gap: nativeTokens.space[1],
  },
  row: {
    flexDirection: "row",
    gap: nativeTokens.space[2],
  },
  flex: {
    flex: 1,
    minWidth: 0,
  },
  textarea: {
    minHeight: nativeTokens.space[16],
    textAlignVertical: "top",
  },
  label: {
    color: nativeTokens.color.ink,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.small.size,
    fontWeight: "700",
  },
  error: {
    color: nativeTokens.color.danger,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.small.size,
  },
});
