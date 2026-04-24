import { RegisterBody } from "@palnet/shared";
import { tokens } from "@palnet/ui-tokens";
import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import { ApiRequestError, registerAction } from "@/lib/auth-actions";

export default function RegisterScreen(): JSX.Element {
  const { t } = useTranslation();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accept, setAccept] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(): Promise<void> {
    setError(null);
    const parsed = RegisterBody.safeParse({
      firstName,
      lastName,
      email,
      password,
      acceptTerms: accept || undefined,
    });
    if (!parsed.success) {
      setError(t("auth.errors.VALIDATION_FAILED"));
      return;
    }
    setBusy(true);
    try {
      await registerAction(parsed.data);
      router.replace("/(app)/onboarding");
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
    <SafeAreaView className="bg-surface-muted flex-1">
      <View className="flex-1 gap-4 px-6 pt-12">
        <Text className="text-ink text-3xl font-bold">{t("auth.register")}</Text>

        <Field
          label={t("auth.firstName")}
          value={firstName}
          onChangeText={setFirstName}
          autoComplete="name-given"
        />
        <Field
          label={t("auth.lastName")}
          value={lastName}
          onChangeText={setLastName}
          autoComplete="name-family"
        />
        <Field
          label={t("auth.email")}
          value={email}
          onChangeText={setEmail}
          autoComplete="email"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Field
          label={t("auth.password")}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password-new"
        />

        <View className="flex-row items-center gap-3">
          <Switch value={accept} onValueChange={setAccept} />
          <Text className="text-ink flex-1">{t("auth.acceptTerms")}</Text>
        </View>

        {error ? (
          <Text className="text-danger text-sm" accessibilityRole="alert">
            {error}
          </Text>
        ) : null}

        <Pressable
          onPress={onSubmit}
          disabled={busy}
          className="bg-brand-600 shadow-card rounded-md px-6 py-3"
        >
          {busy ? (
            <ActivityIndicator color={tokens.color.ink.inverse} />
          ) : (
            <Text className="text-ink-inverse text-center">{t("auth.submitRegister")}</Text>
          )}
        </Pressable>

        <Pressable onPress={() => router.replace("/(auth)/login")}>
          <Text className="text-brand-600 text-center">{t("auth.toLogin")}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  secureTextEntry?: boolean;
  autoComplete?: React.ComponentProps<typeof TextInput>["autoComplete"];
  keyboardType?: React.ComponentProps<typeof TextInput>["keyboardType"];
  autoCapitalize?: React.ComponentProps<typeof TextInput>["autoCapitalize"];
}): JSX.Element {
  return (
    <View className="flex-col gap-1">
      <Text className="text-ink-muted text-sm">{props.label}</Text>
      <TextInput
        value={props.value}
        onChangeText={props.onChangeText}
        secureTextEntry={props.secureTextEntry}
        autoComplete={props.autoComplete}
        keyboardType={props.keyboardType}
        autoCapitalize={props.autoCapitalize}
        className="border-ink-muted/30 bg-surface text-ink rounded-md border px-3 py-2"
      />
    </View>
  );
}
