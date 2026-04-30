import { Button, Surface, nativeTokens } from "@baydar/ui-native";
import { yupResolver } from "@hookform/resolvers/yup";
import { router } from "expo-router";
import { useState } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";
import * as yup from "yup";

import {
  AuthError,
  AuthFooterLink,
  AuthScaffold,
  AuthTextField,
} from "@/components/auth/AuthScaffold";
import { ApiRequestError, loginAction } from "@/lib/auth-actions";
import { resolvePostAuthRoute } from "@/lib/profile-state";
import { useNetworkStore } from "@/store/network";

interface LoginFormValues {
  email: string;
  password: string;
}

const loginSchema = yup.object({
  email: yup.string().trim().email("auth.validation.email").required("auth.validation.required"),
  password: yup.string().required("auth.validation.required"),
});

export default function LoginScreen(): JSX.Element {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const isConnected = useNetworkStore((state) => state.isConnected);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    defaultValues: { email: "", password: "" },
    mode: "onTouched",
    resolver: yupResolver(loginSchema) as Resolver<LoginFormValues>,
  });

  async function onSubmit(values: LoginFormValues): Promise<void> {
    setError(null);
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
      if (e instanceof ApiRequestError) {
        setError(t(`auth.errors.${e.code}`, { defaultValue: t("auth.errors.INTERNAL") }));
      } else {
        setError(t("auth.errors.INTERNAL"));
      }
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
