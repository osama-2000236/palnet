import { OnboardProfileBody, Profile } from "@palnet/shared";
import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  Text,
  TextInput,
  View,
} from "react-native";

import { apiFetch, ApiRequestError } from "@/lib/api";
import { getAccessToken } from "@/lib/session";

export default function OnboardingScreen(): JSX.Element {
  const { t } = useTranslation();
  const [handle, setHandle] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [headline, setHeadline] = useState("");
  const [location, setLocation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(): Promise<void> {
    setError(null);
    const parsed = OnboardProfileBody.safeParse({
      handle,
      firstName,
      lastName,
      headline: headline || undefined,
      location: location || undefined,
      country: "PS",
    });
    if (!parsed.success) {
      setError(t("auth.errors.VALIDATION_FAILED"));
      return;
    }

    const token = await getAccessToken();
    if (!token) {
      router.replace("/(auth)/login");
      return;
    }

    setBusy(true);
    try {
      await apiFetch("/profiles/onboard", Profile.partial(), {
        method: "POST",
        body: parsed.data,
        token,
      });
      router.replace("/(app)/feed");
    } catch (e) {
      if (e instanceof ApiRequestError) {
        setError(t(`auth.errors.${e.code}`, { defaultValue: t("auth.errors.INTERNAL") }));
      } else {
        setError(t("auth.errors.INTERNAL"));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-surface-muted">
      <View className="flex-1 gap-4 px-6 pt-12">
        <Text className="text-3xl font-bold text-ink">{t("onboarding.title")}</Text>
        <Text className="text-ink-muted">{t("onboarding.subtitle")}</Text>

        <Field
          label={t("auth.firstName")}
          value={firstName}
          onChangeText={setFirstName}
        />
        <Field
          label={t("auth.lastName")}
          value={lastName}
          onChangeText={setLastName}
        />
        <Field
          label={t("onboarding.handle")}
          value={handle}
          onChangeText={(v) => setHandle(v.toLowerCase())}
          autoCapitalize="none"
        />
        <Text className="-mt-2 text-xs text-ink-muted">
          {t("onboarding.handleHint", { handle: handle || "your-handle" })}
        </Text>
        <Field
          label={t("onboarding.headline")}
          value={headline}
          onChangeText={setHeadline}
        />
        <Field
          label={t("onboarding.location")}
          value={location}
          onChangeText={setLocation}
        />

        {error ? (
          <Text className="text-sm text-red-600" accessibilityRole="alert">
            {error}
          </Text>
        ) : null}

        <Pressable
          onPress={onSubmit}
          disabled={busy}
          className="rounded-md bg-brand-600 px-6 py-3 shadow-card"
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-center text-white">{t("onboarding.submit")}</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  autoCapitalize?: React.ComponentProps<typeof TextInput>["autoCapitalize"];
}): JSX.Element {
  return (
    <View className="flex-col gap-1">
      <Text className="text-sm text-ink-muted">{props.label}</Text>
      <TextInput
        value={props.value}
        onChangeText={props.onChangeText}
        autoCapitalize={props.autoCapitalize}
        className="rounded-md border border-ink-muted/30 bg-white px-3 py-2 text-ink"
      />
    </View>
  );
}
