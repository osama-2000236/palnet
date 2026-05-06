import { Button } from "@baydar/ui-native";
import { yupResolver } from "@hookform/resolvers/yup";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { useTranslation } from "react-i18next";
import * as yup from "yup";

import { AuthError, AuthScaffold, AuthTextField } from "@/components/auth/AuthScaffold";
import { ApiRequestError, resetPasswordAction } from "@/lib/auth-actions";

interface ResetPasswordFormValues {
  newPassword: string;
  confirmPassword: string;
}

const resetSchema = yup.object({
  newPassword: yup
    .string()
    .min(10, "auth.reset.validation.passwordMin")
    .matches(/[a-z]/, "auth.reset.validation.passwordLower")
    .matches(/[A-Z]/, "auth.reset.validation.passwordUpper")
    .matches(/\d/, "auth.reset.validation.passwordDigit")
    .required("auth.validation.required"),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref("newPassword")], "auth.reset.passwordMismatch")
    .required("auth.validation.required"),
});

export default function ResetPasswordScreen(): JSX.Element {
  const { t } = useTranslation();
  const { token } = useLocalSearchParams<{ token: string }>();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    defaultValues: { newPassword: "", confirmPassword: "" },
    mode: "onTouched",
    resolver: yupResolver(resetSchema) as Resolver<ResetPasswordFormValues>,
  });

  async function onSubmit(values: ResetPasswordFormValues): Promise<void> {
    setError(null);
    setMessage(null);
    if (!token) {
      setError(t("auth.verify.error"));
      return;
    }
    try {
      await resetPasswordAction(token, values.newPassword);
      setMessage(t("auth.reset.success"));
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
      kicker={t("auth.reset.kicker")}
      title={t("auth.reset.title")}
      subtitle={t("auth.reset.body")}
      testID="reset-password-screen"
    >
      <Controller
        control={control}
        name="newPassword"
        render={({ field: { onBlur, onChange, value } }) => (
          <AuthTextField
            label={t("auth.reset.newPassword")}
            testID="reset-password-input"
            value={value}
            onBlur={onBlur}
            onChangeText={onChange}
            secureTextEntry
            autoComplete="password-new"
            textContentType="newPassword"
            editable={!isSubmitting}
            error={!!errors.newPassword || !!error}
            errorMessage={errors.newPassword?.message ? t(errors.newPassword.message) : undefined}
          />
        )}
      />

      <Controller
        control={control}
        name="confirmPassword"
        render={({ field: { onBlur, onChange, value } }) => (
          <AuthTextField
            label={t("auth.reset.confirmPassword")}
            testID="reset-password-confirm-input"
            value={value}
            onBlur={onBlur}
            onChangeText={onChange}
            secureTextEntry
            autoComplete="password-new"
            textContentType="newPassword"
            editable={!isSubmitting}
            error={!!errors.confirmPassword || !!error}
            errorMessage={
              errors.confirmPassword?.message ? t(errors.confirmPassword.message) : undefined
            }
          />
        )}
      />

      {message ? <AuthError message={message} /> : null}
      {error ? <AuthError message={error} /> : null}

      <Button
        fullWidth
        size="lg"
        loading={isSubmitting}
        testID="reset-password-submit"
        accessibilityLabel={t("auth.reset.submit")}
        onPress={handleSubmit(onSubmit)}
      >
        {t("auth.reset.submit")}
      </Button>

      <Button
        variant="ghost"
        size="md"
        testID="reset-password-login"
        accessibilityLabel={t("auth.reset.backToLogin")}
        onPress={() => router.replace("/(auth)/login")}
      >
        {t("auth.reset.backToLogin")}
      </Button>
    </AuthScaffold>
  );
}
