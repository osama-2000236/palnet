import { Button, Surface, nativeTokens } from "@baydar/ui-native";
import { zodResolver } from "@hookform/resolvers/zod";
import { router, type Href } from "expo-router";
import { useState } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";
import { z } from "zod";

import {
  AuthError,
  AuthFooterLink,
  AuthScaffold,
  AuthTextField,
} from "@/components/auth/AuthScaffold";
import { ApiRequestError, loginAction, restoreAccountAction } from "@/lib/auth-actions";
import { resolvePostAuthRoute } from "@/lib/profile-state";
import { useNetworkStore } from "@/store/network";

interface LoginFormValues {
  email: string;
  password: string;
}

const loginSchema = z.object({
  email: z.string().trim().min(1, "auth.validation.required").email("auth.validation.email"),
  password: z.string().min(1, "auth.validation.required"),
});

export default function LoginScreen(): JSX.Element {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const isConnected = useNetworkStore((state) => state.isConnected);

  const {
    control,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    defaultValues: { email: "", password: "" },
    mode: "onTouched",
    resolver: zodResolver(loginSchema) as Resolver<LoginFormValues>,
  });

  function showError(e: unknown): void {
    if (e instanceof ApiRequestError) {
      setErrorCode(e.code);
      setError(t(`auth.errors.${e.code}`, { defaultValue: t("auth.errors.INTERNAL") }));
    } else {
      setErrorCode(null);
      setError(t("auth.errors.INTERNAL"));
    }
  }

  async function onSubmit(values: LoginFormValues): Promise<void> {
    setError(null);
    setErrorCode(null);
    if (!isConnected) {
      setError(t("auth.errors.OFFLINE"));
      return;
    }
    try {
      const session = await loginAction({
        email: values.email.trim().toLowerCase(),
        password: values.password,
      });
      const route = await resolvePostAuthRoute(session);
      router.replace(route);
    } catch (e) {
      showError(e);
    }
  }

  async function onRestore(): Promise<void> {
    setError(null);
    setErrorCode(null);
    const values = getValues();
    try {
      const session = await restoreAccountAction({
        email: values.email.trim().toLowerCase(),
        password: values.password,
      });
      const route = await resolvePostAuthRoute(session);
      router.replace(route);
    } catch (e) {
      showError(e);
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
      {!isConnected ? <AuthError message={t("auth.errors.OFFLINE")} /> : null}

      <Controller
        control={control}
        name="email"
        render={({ field: { onBlur, onChange, value } }) => (
          <AuthTextField
            label={t("auth.email")}
            testID="login-email-input"
            value={value}
            onBlur={onBlur}
            onChangeText={onChange}
            autoComplete="email"
            keyboardType="email-address"
            autoCapitalize="none"
            textContentType="emailAddress"
            inputMode="email"
            editable={!isSubmitting}
            error={!!errors.email || !!error}
            errorMessage={errors.email?.message ? t(errors.email.message) : undefined}
          />
        )}
      />

      <Controller
        control={control}
        name="password"
        render={({ field: { onBlur, onChange, value } }) => (
          <AuthTextField
            label={t("auth.password")}
            testID="login-password-input"
            value={value}
            onBlur={onBlur}
            onChangeText={onChange}
            secureTextEntry
            autoComplete="password"
            textContentType="password"
            editable={!isSubmitting}
            error={!!errors.password || !!error}
            errorMessage={errors.password?.message ? t(errors.password.message) : undefined}
          />
        )}
      />

      <Button
        variant="ghost"
        size="md"
        testID="login-forgot-password-link"
        accessibilityLabel={t("auth.forgot.link")}
        onPress={() => router.push("/(auth)/forgot-password" as Href)}
      >
        {t("auth.forgot.link")}
      </Button>

      {error ? <AuthError message={error} /> : null}

      <Button
        fullWidth
        size="lg"
        loading={isSubmitting}
        disabled={!isConnected}
        testID="login-submit"
        accessibilityLabel={t("auth.submitLogin")}
        onPress={handleSubmit(onSubmit)}
      >
        {t("auth.submitLogin")}
      </Button>

      {errorCode === "ACCOUNT_DELETED_PENDING_RESTORE" ? (
        <Button
          fullWidth
          variant="secondary"
          size="lg"
          disabled={!isConnected}
          testID="login-restore"
          accessibilityLabel={t("auth.restoreCta")}
          onPress={() => void onRestore()}
        >
          {t("auth.restoreCta")}
        </Button>
      ) : null}

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
