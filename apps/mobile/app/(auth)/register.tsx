import { RegisterBody } from "@baydar/shared";
import { Button, Surface, nativeTokens } from "@baydar/ui-native";
import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, Switch, Text, View } from "react-native";

import {
  AuthError,
  AuthFooterLink,
  AuthScaffold,
  AuthTextField,
} from "@/components/auth/AuthScaffold";
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
    <AuthScaffold
      appName={t("common.appName")}
      kicker={t("auth.registerKicker")}
      title={t("auth.createProfile")}
      subtitle={t("auth.registerSubtitle")}
      testID="register-screen"
      footer={
        <AuthFooterLink
          label={t("auth.haveAccount")}
          actionLabel={t("auth.login")}
          testID="register-login-link"
          onPress={() => router.replace("/(auth)/login")}
        />
      }
    >
      <View style={{ gap: nativeTokens.space[3] }}>
        <AuthTextField
          label={t("auth.firstName")}
          testID="register-first-name-input"
          value={firstName}
          onChangeText={setFirstName}
          autoComplete="name-given"
          textContentType="givenName"
        />
        <AuthTextField
          label={t("auth.lastName")}
          testID="register-last-name-input"
          value={lastName}
          onChangeText={setLastName}
          autoComplete="name-family"
          textContentType="familyName"
        />
      </View>

      <AuthTextField
        label={t("auth.email")}
        testID="register-email-input"
        value={email}
        onChangeText={setEmail}
        autoComplete="email"
        keyboardType="email-address"
        autoCapitalize="none"
        textContentType="emailAddress"
        inputMode="email"
      />

      <AuthTextField
        label={t("auth.password")}
        hint={t("auth.passwordHint")}
        testID="register-password-input"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="password-new"
        textContentType="newPassword"
      />

      <Surface variant="tinted" padding="3">
        <Pressable
          accessibilityRole="switch"
          accessibilityState={{ checked: accept }}
          accessibilityLabel={t("auth.acceptTerms")}
          testID="register-accept-terms"
          onPress={() => setAccept((value) => !value)}
          style={{
            minHeight: nativeTokens.chrome.minHit,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: nativeTokens.space[3],
          }}
        >
          <Text
            selectable
            style={{
              flex: 1,
              color: nativeTokens.color.ink,
              fontFamily: nativeTokens.type.family.body,
              fontSize: nativeTokens.type.scale.small.size,
              lineHeight: nativeTokens.type.scale.small.line,
              textAlign: "right",
            }}
          >
            {t("auth.acceptTerms")}
          </Text>
          <Switch
            value={accept}
            onValueChange={setAccept}
            trackColor={{
              false: nativeTokens.color.surfaceSunken,
              true: nativeTokens.color.brand200,
            }}
            thumbColor={accept ? nativeTokens.color.brand600 : nativeTokens.color.surface}
          />
        </Pressable>
      </Surface>

      {error ? <AuthError message={error} /> : null}

      <Button
        fullWidth
        size="lg"
        loading={busy}
        testID="register-submit"
        accessibilityLabel={t("auth.submitRegister")}
        onPress={onSubmit}
      >
        {t("auth.submitRegister")}
      </Button>
    </AuthScaffold>
  );
}
