// Create a company page — native twin of apps/web .../employer/new/page.tsx.
//
// Mobile had no route for this at all, so `/employer` for a member of no company
// rendered "لا توجد شركات." and stopped: the whole employer side of the product
// was unreachable from the phone, on a phone-first market. Same field contract
// and `POST /companies` body as web.

import { Company, CreateCompanyBody, PS_INDUSTRIES } from "@baydar/shared";
import {
  Alert,
  AppBand,
  Button,
  Chip,
  Input,
  Surface,
  nativeTokens,
  useThemeTokens,
  type NativeTheme,
} from "@baydar/ui-native";
import { Stack, useRouter } from "expo-router";
import { useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CityField } from "@/components/CityField";
import { apiFetch } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-errors";

type FormState = {
  slug: string;
  name: string;
  tagline: string;
  website: string;
  industry: string;
  city: string;
};

const EMPTY: FormState = {
  slug: "",
  name: "",
  tagline: "",
  website: "",
  industry: "",
  city: "",
};

export default function NewCompanyScreen(): JSX.Element {
  const styles = useStyles();
  const { i18n, t } = useTranslation();
  const router = useRouter();
  const isArabic = i18n.language.startsWith("ar");

  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Mirrors CreateCompanyBody's own minimums so the button is honest about
  // whether a submit can succeed rather than round-tripping a 422.
  const valid =
    form.name.trim().length > 0 && /^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(form.slug.trim());

  const onSubmit = async (): Promise<void> => {
    if (!valid || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const body = CreateCompanyBody.parse({
        slug: form.slug.trim(),
        name: form.name.trim(),
        tagline: form.tagline.trim() || undefined,
        website: form.website.trim() || undefined,
        industry: form.industry.trim() || undefined,
        city: form.city.trim() || undefined,
        country: "PS",
      });
      const created = await apiFetch("/companies", Company, { method: "POST", body });
      router.replace({ pathname: "/(app)/employer/[slug]", params: { slug: created.slug } });
    } catch (e) {
      setError(apiErrorMessage(t, e));
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView edges={["left", "right", "bottom"]} style={styles.screen}>
      <StatusBar barStyle="light-content" />
      <AppBand
        title={t("employer.newCompany.title")}
        subtitle={t("employer.newCompany.subtitle")}
        density="compact"
        trailing={
          <Button variant="ghost" size="sm" onPress={() => router.back()}>
            {t("common.cancel")}
          </Button>
        }
      />
      <Stack.Screen options={{ title: t("employer.newCompany.title"), headerShown: false }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Surface variant="card" padding="4" style={styles.formCard}>
            <Field label={t("employer.form.name")} styles={styles}>
              <Input
                fullWidth
                value={form.name}
                onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
                placeholder={t("employer.form.name")}
                accessibilityLabel={t("employer.form.name")}
                maxLength={120}
              />
            </Field>
            <Field label={t("employer.form.slug")} styles={styles}>
              <Input
                fullWidth
                value={form.slug}
                onChangeText={(v) => setForm((f) => ({ ...f, slug: v.toLowerCase() }))}
                placeholder={t("employer.form.slug")}
                accessibilityLabel={t("employer.form.slug")}
                helperText={t("employer.form.slugHelp")}
                autoCapitalize="none"
                autoCorrect={false}
                inputStyle={styles.ltr}
                maxLength={40}
              />
            </Field>
            <Field label={t("employer.form.tagline")} styles={styles}>
              <Input
                fullWidth
                value={form.tagline}
                onChangeText={(v) => setForm((f) => ({ ...f, tagline: v }))}
                placeholder={t("employer.form.tagline")}
                accessibilityLabel={t("employer.form.tagline")}
                maxLength={160}
              />
            </Field>
            <Field label={t("employer.form.website")} styles={styles}>
              <Input
                fullWidth
                value={form.website}
                onChangeText={(v) => setForm((f) => ({ ...f, website: v }))}
                placeholder={t("employer.form.website")}
                accessibilityLabel={t("employer.form.website")}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                inputStyle={styles.ltr}
              />
            </Field>
            {/* Web offers PS_INDUSTRIES through a <datalist>; native has no such
                control, so the same canonical list is offered as chips. Free text
                stays allowed either way — the jobs sector facet just matches when
                the canonical name is used. */}
            <Field label={t("employer.form.industry")} styles={styles}>
              <Input
                fullWidth
                value={form.industry}
                onChangeText={(v) => setForm((f) => ({ ...f, industry: v }))}
                placeholder={t("employer.form.industry")}
                accessibilityLabel={t("employer.form.industry")}
              />
              {/* One scrolling row, not a wrapped block: 14 chips wrapped pushed
                  the city field and the submit button off the first screen. */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chips}
              >
                {PS_INDUSTRIES.map((industry) => (
                  <Chip
                    key={industry.key}
                    selected={form.industry === industry.ar}
                    onPress={() => setForm((f) => ({ ...f, industry: industry.ar }))}
                  >
                    {isArabic ? industry.ar : industry.en}
                  </Chip>
                ))}
              </ScrollView>
            </Field>
            <Field label={t("employer.form.city")} styles={styles}>
              <CityField value={form.city} onChange={(city) => setForm((f) => ({ ...f, city }))} />
            </Field>
            {error ? (
              <Alert body={error} cta={t("common.retry")} onAction={() => void onSubmit()} />
            ) : null}
            <Button
              variant="primary"
              fullWidth
              loading={submitting}
              disabled={!valid}
              onPress={() => void onSubmit()}
              accessibilityLabel={t("employer.form.submit")}
            >
              {submitting ? t("employer.form.submitting") : t("employer.form.submit")}
            </Button>
          </Surface>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** Visible label above a control — native `Input` carries no `label` prop. */
function Field({
  label,
  styles,
  children,
}: {
  label: string;
  styles: ReturnType<typeof makeStyles>;
  children: ReactNode;
}): JSX.Element {
  return (
    <View style={styles.labeledField}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function makeStyles(c: NativeTheme["color"]) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.surfaceMuted },
    flex: { flex: 1 },
    scrollContent: {
      paddingHorizontal: nativeTokens.space[4],
      paddingTop: nativeTokens.space[3],
      paddingBottom: nativeTokens.space[6],
    },
    formCard: { gap: nativeTokens.space[4] },
    ltr: {
      // eslint-disable-next-line no-restricted-syntax -- paired with writingDirection ltr: the slug and the URL are Latin identifiers, and RTL puts their punctuation on the wrong side.
      textAlign: "left",
      writingDirection: "ltr",
    },
    chips: { flexDirection: "row", gap: nativeTokens.space[2], paddingVertical: 2 },
    labeledField: { gap: nativeTokens.space[1] },
    fieldLabel: {
      color: c.inkMuted,
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.small.size,
      lineHeight: nativeTokens.type.scale.small.line,
      fontWeight: "600",
      textAlign: "auto",
    },
  });
}

function useStyles() {
  const c = useThemeTokens().color;
  return useMemo(() => makeStyles(c), [c]);
}
