import { Button, nativeTokens } from "@baydar/ui-native";
import { yupResolver } from "@hookform/resolvers/yup";
import { router } from "expo-router";
import { useState } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { useTranslation } from "react-i18next";
import * as yup from "yup";

import { AuthError, AuthScaffold, AuthTextField } from "@/components/auth/AuthScaffold";
import { ApiRequestError, forgotPasswordAction } from "@/lib/auth-actions";
import { useNetworkStore } from "@/store/network";

interface ForgotPasswordFormValues {
  email: string;
}

const forgotSchema = yup.object({
  email: yup.string().trim().email("auth.validation.email").required("auth.validation.required"),
});

export default function ForgotPasswordScreen(): JSX.Element {
  const { t } = useTranslation();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isConnected = useNetworkStore((state) => state.isConnected);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    defaultValues: { email: "" },
    mode: "onTouched",
    resolver: yupResolver(forgotSchema) as Resolver<ForgotPasswordFormValues>,
  });

  async function onSubmit(values: ForgotPasswordFormValues): Promise<void> {
    setError(null);
    setMessage(null);
    if (!isConnected) {
      setError(t("auth.errors.OFFLINE"));
      return;
    }
    try {
      await forgotPasswordAction(values.email.trim().toLowerCase());
      setMessage(t("auth.forgot.sent"));
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
      kicker={t("auth.forgot.kicker")}
      title={t("auth.forgot.title")}
      subtitle={t("auth.forgot.body")}
      testID="forgot-password-screen"
    >
      <Controller
        control={control}
        name="email"
        render={({ field: { onBlur, onChange, value } }) => (
          <AuthTextField
            label={t("auth.email")}
            testID="forgot-email-input"
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

      {message ? <AuthError message={message} /> : null}
      {error ? <AuthError message={error} /> : null}

      <Button
        fullWidth
        size="lg"
        loading={isSubmitting}
        disabled={!isConnected}
        testID="forgot-password-submit"
        accessibilityLabel={t("auth.forgot.submit")}
        onPress={handleSubmit(onSubmit)}
      >
        {t("auth.forgot.submit")}
      </Button>

      <Button
        variant="ghost"
        size="md"
        testID="forgot-password-back"
        accessibilityLabel={t("auth.forgot.backToLogin")}
        onPress={() => router.replace("/(auth)/login")}
        style={{ marginTop: nativeTokens.space[1] }}
      >
        {t("auth.forgot.backToLogin")}
      </Button>
    </AuthScaffold>
  );
}
