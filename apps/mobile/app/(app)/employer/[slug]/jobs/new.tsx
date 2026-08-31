// Post a job — native twin of apps/web .../employer/[slug]/jobs/new/page.tsx.
// Same field contract and POST /companies/:id/jobs body; enum labels reuse
// the jobs.typeLabels / jobs.locationLabels strings the jobs filters use.

import {
  belowMinimumWage,
  Company,
  EmployerJob,
  formatMinimumWage,
  JobLocationMode,
  JobType,
  minimumWageFloor,
  PayBasis,
} from "@baydar/shared";
import {
  Alert,
  AppBand,
  Button,
  Input,
  RadioGroup,
  Surface,
  nativeTokens,
  useThemeTokens,
  type NativeTheme,
} from "@baydar/ui-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CityField } from "@/components/CityField";
import { apiFetch } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-errors";

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
  const styles = useStyles();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();

  const [companyId, setCompanyId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

  const valid = form.title.trim().length >= 3 && form.description.trim().length >= 30;

  // The form has no pay-basis control yet, so every job it creates takes
  // CreateJobBody's MONTHLY default. Phase 2 (MATCHING.md §2) adds the control
  // and this reads `form.payBasis` instead.
  const payBasis = PayBasis.MONTHLY;
  // Warned, never blocked — same reasoning as the web twin.
  const belowMinimum = belowMinimumWage({
    type: form.type,
    payBasis,
    salaryMin: form.salaryMin ? Number(form.salaryMin) : null,
    salaryMax: form.salaryMax ? Number(form.salaryMax) : null,
    salaryCurrency: form.salaryCurrency || "ILS",
  });
  const floor = minimumWageFloor(form.type, payBasis);

  const onSubmit = async (): Promise<void> => {
    if (!companyId || !valid || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const body = {
        title: form.title.trim(),
        description: form.description.trim(),
        type: form.type,
        locationMode: form.locationMode,
        ...(form.city.trim() ? { city: form.city.trim() } : {}),
        country: "PS",
        ...(form.salaryMin ? { salaryMin: Number(form.salaryMin) } : {}),
        ...(form.salaryMax ? { salaryMax: Number(form.salaryMax) } : {}),
        salaryCurrency: form.salaryCurrency || "ILS",
        skillsRequired: [],
      };
      await apiFetch(`/companies/${companyId}/jobs`, EmployerJob, { method: "POST", body });
      router.replace({ pathname: "/(app)/employer/[slug]", params: { slug } });
    } catch (e) {
      setError(apiErrorMessage(t, e));
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView edges={["left", "right", "bottom"]} style={styles.screen}>
      <AppBand
        title={t("employer.newJob.title")}
        density="compact"
        trailing={
          <Button variant="ghost" size="sm" onPress={() => router.back()}>
            {t("common.cancel")}
          </Button>
        }
      />
      <Stack.Screen options={{ title: t("employer.newJob.title"), headerShown: false }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Surface variant="card" padding="4" style={styles.formCard}>
            <Input
              fullWidth
              value={form.title}
              onChangeText={(v) => setForm((f) => ({ ...f, title: v }))}
              placeholder={t("employer.newJob.fieldTitle")}
              accessibilityLabel={t("employer.newJob.fieldTitle")}
              maxLength={160}
            />
            <Input
              fullWidth
              multiline
              numberOfLines={6}
              value={form.description}
              onChangeText={(v) => setForm((f) => ({ ...f, description: v }))}
              placeholder={t("employer.newJob.description")}
              accessibilityLabel={t("employer.newJob.description")}
              helperText={t("employer.newJob.descriptionHint")}
              inputStyle={styles.multiline}
            />
            <RadioGroup
              label={t("employer.newJob.type")}
              value={form.type}
              onValueChange={(v) => setForm((f) => ({ ...f, type: v as JobType }))}
              items={Object.values(JobType).map((v) => ({
                value: v,
                label: t(`jobs.typeLabels.${v}`),
              }))}
            />
            <RadioGroup
              label={t("employer.newJob.locationMode")}
              value={form.locationMode}
              onValueChange={(v) => setForm((f) => ({ ...f, locationMode: v as JobLocationMode }))}
              items={Object.values(JobLocationMode).map((v) => ({
                value: v,
                label: t(`jobs.locationLabels.${v}`),
              }))}
            />
            <CityField value={form.city} onChange={(city) => setForm((f) => ({ ...f, city }))} />
            <View style={styles.salaryRow}>
              <Input
                style={styles.salaryField}
                keyboardType="numeric"
                value={form.salaryMin}
                onChangeText={(v) => setForm((f) => ({ ...f, salaryMin: v }))}
                placeholder={t("employer.newJob.salaryMin")}
                accessibilityLabel={t("employer.newJob.salaryMin")}
              />
              <Input
                style={styles.salaryField}
                keyboardType="numeric"
                value={form.salaryMax}
                onChangeText={(v) => setForm((f) => ({ ...f, salaryMax: v }))}
                placeholder={t("employer.newJob.salaryMax")}
                accessibilityLabel={t("employer.newJob.salaryMax")}
              />
              <Input
                style={styles.salaryField}
                autoCapitalize="characters"
                maxLength={3}
                value={form.salaryCurrency}
                onChangeText={(v) => setForm((f) => ({ ...f, salaryCurrency: v.toUpperCase() }))}
                placeholder={t("employer.newJob.salaryCurrency")}
                accessibilityLabel={t("employer.newJob.salaryCurrency")}
              />
            </View>
            {belowMinimum && floor !== null ? (
              <Alert
                kind="warning"
                title={t("employer.newJob.belowMinimum.title")}
                body={`${t(`employer.newJob.belowMinimum.${payBasis}`, {
                  amount: formatMinimumWage(floor, i18n.language),
                })} ${t("employer.newJob.belowMinimum.note")}`}
              />
            ) : null}
            {error ? (
              <Alert body={error} cta={t("common.retry")} onAction={() => void onSubmit()} />
            ) : null}
            <Button
              variant="primary"
              fullWidth
              loading={submitting}
              disabled={!companyId || !valid}
              onPress={() => void onSubmit()}
              accessibilityLabel={t("employer.newJob.submit")}
            >
              {submitting ? t("employer.newJob.submitting") : t("employer.newJob.submit")}
            </Button>
          </Surface>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(c: NativeTheme["color"]) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: c.surfaceMuted,
    },
    flex: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: nativeTokens.space[4],
      paddingTop: nativeTokens.space[3],
      paddingBottom: nativeTokens.space[6],
    },
    formCard: {
      gap: nativeTokens.space[4],
    },
    multiline: {
      minHeight: nativeTokens.space[24],
      textAlignVertical: "top",
    },
    salaryRow: {
      flexDirection: "row",
      gap: nativeTokens.space[3],
    },
    salaryField: {
      flex: 1,
    },
  });
}

function useStyles() {
  const c = useThemeTokens().color;
  return useMemo(() => makeStyles(c), [c]);
}
