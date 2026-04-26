// Onboarding — ported to ui-native atoms + nativeTokens.
// Mirrors the web /onboarding layout: title, subtitle, stacked fields, one
// CTA. Uses Button for the submit so the loading/disabled pattern matches
// every other screen.

import { OnboardProfileBody, Profile } from "@baydar/shared";
import { Button, nativeTokens } from "@baydar/ui-native";
import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
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
        setError(
          t(`auth.errors.${e.code}`, {
            defaultValue: t("auth.errors.INTERNAL"),
          }),
        );
      } else {
        setError(t("auth.errors.INTERNAL"));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: nativeTokens.color.surfaceMuted }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: nativeTokens.space[6],
            paddingTop: nativeTokens.space[12],
            paddingBottom: nativeTokens.space[8],
            gap: nativeTokens.space[4],
          }}
          keyboardShouldPersistTaps="handled"
        >
          <Text
            style={{
              color: nativeTokens.color.ink,
              fontFamily: nativeTokens.type.family.sans,
              fontSize: nativeTokens.type.scale.display.size,
              lineHeight: nativeTokens.type.scale.display.line,
              fontWeight: "700",
            }}
          >
            {t("onboarding.title")}
          </Text>
          <Text
            style={{
              color: nativeTokens.color.inkMuted,
              fontFamily: nativeTokens.type.family.sans,
              fontSize: nativeTokens.type.scale.body.size,
              lineHeight: nativeTokens.type.scale.body.line,
            }}
          >
            {t("onboarding.subtitle")}
          </Text>

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
            hint={t("onboarding.handleHint", {
              handle: handle || "your-handle",
            })}
          />
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
            <Text
              accessibilityRole="alert"
              style={{
                color: nativeTokens.color.danger,
                fontFamily: nativeTokens.type.family.sans,
                fontSize: nativeTokens.type.scale.small.size,
              }}
            >
              {error}
            </Text>
          ) : null}

          <View style={{ marginTop: nativeTokens.space[2] }}>
            <Button
              variant="primary"
              size="lg"
              fullWidth
              loading={busy}
              onPress={() => void onSubmit()}
            >
              {t("onboarding.submit")}
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  autoCapitalize?: React.ComponentProps<typeof TextInput>["autoCapitalize"];
  hint?: string;
}): JSX.Element {
  return (
    <View style={{ gap: nativeTokens.space[1] }}>
      <Text
        style={{
          color: nativeTokens.color.inkMuted,
          fontFamily: nativeTokens.type.family.sans,
          fontSize: nativeTokens.type.scale.small.size,
        }}
      >
        {props.label}
      </Text>
      <TextInput
        value={props.value}
        onChangeText={props.onChangeText}
        autoCapitalize={props.autoCapitalize}
        placeholderTextColor={nativeTokens.color.inkMuted}
        style={{
          borderRadius: nativeTokens.radius.md,
          borderWidth: 1,
          borderColor: nativeTokens.color.lineHard,
          backgroundColor: nativeTokens.color.surface,
          paddingHorizontal: nativeTokens.space[3],
          paddingVertical: nativeTokens.space[2],
          color: nativeTokens.color.ink,
          fontFamily: nativeTokens.type.family.sans,
          fontSize: nativeTokens.type.scale.body.size,
        }}
      />
      {props.hint ? (
        <Text
          style={{
            color: nativeTokens.color.inkMuted,
            fontFamily: nativeTokens.type.family.sans,
            fontSize: nativeTokens.type.scale.caption.size,
          }}
        >
          {props.hint}
        </Text>
      ) : null}
    </View>
  );
}
