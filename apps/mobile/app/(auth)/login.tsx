import { Button, Surface, nativeTokens } from "@baydar/ui-native";
import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

import {
  AuthError,
  AuthFooterLink,
  AuthScaffold,
  AuthTextField,
} from "@/components/auth/AuthScaffold";
import { ApiRequestError, loginAction } from "@/lib/auth-actions";

export default function LoginScreen(): JSX.Element {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(): Promise<void> {
    setError(null);
    setBusy(true);
    try {
      await loginAction({ email, password });
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
    <AuthScaffold
      appName={t("common.appName")}
      kicker={t("auth.loginKicker")}
      title={t("auth.welcomeBack")}
      subtitle={t("auth.loginSubtitle")}
      testID="login-screen"
      footer={
        <AuthFooterLink
          label={t("auth.noAccount")}
          actionLabel={t("auth.register")}
          testID="login-register-link"
          onPress={() => router.replace("/(auth)/register")}
        />
      }
    >
      <AuthTextField
        label={t("auth.email")}
        testID="login-email-input"
        value={email}
        onChangeText={setEmail}
        autoComplete="email"
        keyboardType="email-address"
        autoCapitalize="none"
        textContentType="emailAddress"
        inputMode="email"
        error={!!error}
      />

      <AuthTextField
        label={t("auth.password")}
        testID="login-password-input"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="password"
        textContentType="password"
        error={!!error}
      />

      {error ? <AuthError message={error} /> : null}

      <Button
        fullWidth
        size="lg"
        loading={busy}
        testID="login-submit"
        accessibilityLabel={t("auth.submitLogin")}
        onPress={onSubmit}
      >
        {t("auth.submitLogin")}
      </Button>

      <Surface variant="tinted" padding="3">
        <View style={{ gap: nativeTokens.space[1] }}>
          <Text
            selectable
            style={{
              color: nativeTokens.color.ink,
              fontFamily: nativeTokens.type.family.sans,
              fontSize: nativeTokens.type.scale.small.size,
              fontWeight: "600",
              lineHeight: nativeTokens.type.scale.small.line,
              textAlign: "right",
            }}
          >
            {t("auth.secureHintTitle")}
          </Text>
          <Text
            selectable
            style={{
              color: nativeTokens.color.inkMuted,
              fontFamily: nativeTokens.type.family.body,
              fontSize: nativeTokens.type.scale.small.size,
              lineHeight: nativeTokens.type.scale.small.line,
              textAlign: "right",
            }}
          >
            {t("auth.secureHint")}
          </Text>
        </View>
      </Surface>
    </AuthScaffold>
  );
}
