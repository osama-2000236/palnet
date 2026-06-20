// Create-company screen — native twin of
// apps/web/src/app/[locale]/(app)/employer/new/page.tsx. Closes the P1 mobile
// employer parity gap: a mobile owner can now create a company page.

import { Company, CreateCompanyBody } from "@baydar/shared";
import { AppHeader, Button, Input, Surface, nativeTokens } from "@baydar/ui-native";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { apiFetch } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-errors";
import { successHaptic } from "@/lib/haptics";
import { getAccessToken } from "@/lib/session";

type FormState = {
  slug: string;
  name: string;
  tagline: string;
  website: string;
  industry: string;
  city: string;
  country: string;
};

const EMPTY: FormState = {
  slug: "",
  name: "",
  tagline: "",
  website: "",
  industry: "",
  city: "",
  country: "PS",
};

export default function NewCompanyScreen(): JSX.Element {
  const { t } = useTranslation();
  const [token, setToken] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void (async () => {
      const accessToken = await getAccessToken();
      if (!accessToken) router.replace("/(auth)/login");
      else setToken(accessToken);
    })();
  }, []);

  const set = (key: keyof FormState) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async (): Promise<void> => {
    if (!token) return;
    setError(null);
    const parsed = CreateCompanyBody.safeParse({
      slug: form.slug,
      name: form.name,
      tagline: form.tagline || undefined,
      website: form.website || undefined,
      industry: form.industry || undefined,
      city: form.city || undefined,
      country: form.country || "PS",
    });
    if (!parsed.success) {
      setError(t("employer.form.invalid"));
      return;
    }
    setSubmitting(true);
    try {
      const created = await apiFetch("/companies", Company, {
        method: "POST",
        token,
        body: parsed.data,
      });
      successHaptic();
      router.replace({
        pathname: "/(app)/employer/[slug]",
        params: { slug: created.slug },
      });
    } catch (caught) {
      setError(apiErrorMessage(t, caught));
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.wrap}>
        <AppHeader
          title={t("employer.form.title")}
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
              <Field label={t("employer.form.name")} required>
                <Input fullWidth size="lg" value={form.name} onChangeText={set("name")} />
              </Field>
              <Field label={t("employer.form.slug")} hint={t("employer.form.slugHelp")} required>
                <Input
                  fullWidth
                  size="lg"
                  autoCapitalize="none"
                  value={form.slug}
                  onChangeText={(v) => set("slug")(v.toLowerCase())}
                />
              </Field>
              <Field label={t("employer.form.tagline")}>
                <Input fullWidth size="lg" value={form.tagline} onChangeText={set("tagline")} />
              </Field>
              <Field label={t("employer.form.website")}>
                <Input
                  fullWidth
                  size="lg"
                  autoCapitalize="none"
                  keyboardType="url"
                  value={form.website}
                  onChangeText={set("website")}
                />
              </Field>
              <Field label={t("employer.form.industry")}>
                <Input fullWidth size="lg" value={form.industry} onChangeText={set("industry")} />
              </Field>
              <Field label={t("employer.form.city")}>
                <Input fullWidth size="lg" value={form.city} onChangeText={set("city")} />
              </Field>
              <Field label={t("employer.form.country")}>
                <Input
                  fullWidth
                  size="lg"
                  autoCapitalize="characters"
                  maxLength={2}
                  value={form.country}
                  onChangeText={(v) => set("country")(v.toUpperCase())}
                />
              </Field>
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
            disabled={submitting || !form.name || !form.slug}
            loading={submitting}
            onPress={() => void submit()}
            accessibilityLabel={t("employer.form.submit")}
          >
            {submitting ? t("employer.form.submitting") : t("employer.form.submit")}
          </Button>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
        {required ? " *" : ""}
      </Text>
      {children}
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
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
  label: {
    color: nativeTokens.color.ink,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.small.size,
    fontWeight: "700",
  },
  hint: {
    color: nativeTokens.color.inkMuted,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.caption.size,
  },
  error: {
    color: nativeTokens.color.danger,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.small.size,
  },
});
