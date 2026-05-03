import { Button, Surface, nativeTokens } from "@baydar/ui-native";
import { yupResolver } from "@hookform/resolvers/yup";
import { router } from "expo-router";
import { useState } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Pressable, Switch, Text, View } from "react-native";
import * as yup from "yup";

import {
  AuthError,
  AuthFooterLink,
  AuthScaffold,
  AuthTextField,
} from "@/components/auth/AuthScaffold";
import { ApiRequestError, registerAction } from "@/lib/auth-actions";
import { useNetworkStore } from "@/store/network";

interface RegisterFormValues {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  acceptTerms: boolean;
}

const registerSchema = yup.object({
  firstName: yup
    .string()
    .trim()
    .min(1, "auth.validation.required")
    .max(60, "auth.validation.nameMax")
    .required("auth.validation.required"),
  lastName: yup
    .string()
    .trim()
    .min(1, "auth.validation.required")
    .max(60, "auth.validation.nameMax")
    .required("auth.validation.required"),
  email: yup.string().trim().email("auth.validation.email").required("auth.validation.required"),
  password: yup
    .string()
    .min(8, "auth.validation.passwordMin")
    .matches(/[A-Za-z]/, "auth.validation.passwordLetter")
    .matches(/\d/, "auth.validation.passwordDigit")
    .required("auth.validation.required"),
  acceptTerms: yup.boolean().oneOf([true], "auth.validation.terms").required(),
});

export default function RegisterScreen(): JSX.Element {
  const { i18n, t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const isConnected = useNetworkStore((state) => state.isConnected);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = useForm<RegisterFormValues>({
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      acceptTerms: false,
    },
    mode: "onTouched",
    resolver: yupResolver(registerSchema) as Resolver<RegisterFormValues>,
  });

  const accept = watch("acceptTerms");

  async function onSubmit(values: RegisterFormValues): Promise<void> {
    setError(null);
    if (!isConnected) {
      setError(t("auth.errors.OFFLINE"));
      return;
    }
    try {
      await registerAction({
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        email: values.email.trim().toLowerCase(),
        password: values.password,
        locale: i18n.language,
        acceptTerms: true,
      });
      router.replace({
        pathname: "/(app)/onboarding",
        params: {
          firstName: values.firstName.trim(),
          lastName: values.lastName.trim(),
        },
      });
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
      {!isConnected ? <AuthError message={t("auth.errors.OFFLINE")} /> : null}

      <View style={{ gap: nativeTokens.space[3] }}>
        <Controller
          control={control}
          name="firstName"
          render={({ field: { onBlur, onChange, value } }) => (
            <AuthTextField
              label={t("auth.firstName")}
              testID="register-first-name-input"
              value={value}
              onBlur={onBlur}
              onChangeText={onChange}
              autoComplete="name-given"
              textContentType="givenName"
              editable={!isSubmitting}
              error={!!errors.firstName}
              errorMessage={errors.firstName?.message ? t(errors.firstName.message) : undefined}
            />
          )}
        />
        <Controller
          control={control}
          name="lastName"
          render={({ field: { onBlur, onChange, value } }) => (
            <AuthTextField
              label={t("auth.lastName")}
              testID="register-last-name-input"
              value={value}
              onBlur={onBlur}
              onChangeText={onChange}
              autoComplete="name-family"
              textContentType="familyName"
              editable={!isSubmitting}
              error={!!errors.lastName}
              errorMessage={errors.lastName?.message ? t(errors.lastName.message) : undefined}
            />
          )}
        />
      </View>

      <Controller
        control={control}
        name="email"
        render={({ field: { onBlur, onChange, value } }) => (
          <AuthTextField
            label={t("auth.email")}
            testID="register-email-input"
            value={value}
            onBlur={onBlur}
            onChangeText={onChange}
            autoComplete="email"
            keyboardType="email-address"
            autoCapitalize="none"
            textContentType="emailAddress"
            inputMode="email"
            editable={!isSubmitting}
            error={!!errors.email}
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
            hint={t("auth.passwordHint")}
            testID="register-password-input"
            value={value}
            onBlur={onBlur}
            onChangeText={onChange}
            secureTextEntry
            autoComplete="password-new"
            textContentType="newPassword"
            editable={!isSubmitting}
            error={!!errors.password}
            errorMessage={errors.password?.message ? t(errors.password.message) : undefined}
          />
        )}
      />

      <Surface variant="tinted" padding="3">
        <Pressable
          accessibilityRole="switch"
          accessibilityState={{ checked: accept }}
          accessibilityLabel={t("auth.acceptTerms")}
          testID="register-accept-terms"
          onPress={() => {
            setValue("acceptTerms", !accept, { shouldDirty: true, shouldValidate: true });
          }}
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
            onValueChange={(value) =>
              setValue("acceptTerms", value, { shouldDirty: true, shouldValidate: true })
            }
            disabled={isSubmitting}
            trackColor={{
              false: nativeTokens.color.surfaceSunken,
              true: nativeTokens.color.brand200,
            }}
            thumbColor={accept ? nativeTokens.color.brand600 : nativeTokens.color.surface}
          />
        </Pressable>
        {errors.acceptTerms?.message ? (
          <Text
            selectable
            accessibilityRole="alert"
            style={{
              color: nativeTokens.color.danger,
              fontFamily: nativeTokens.type.family.sans,
              fontSize: nativeTokens.type.scale.caption.size,
              lineHeight: nativeTokens.type.scale.caption.line,
              textAlign: "right",
            }}
          >
            {t(errors.acceptTerms.message)}
          </Text>
        ) : null}
      </Surface>

      {error ? <AuthError message={error} /> : null}

      <Button
        fullWidth
        size="lg"
        loading={isSubmitting}
        disabled={!isConnected}
        testID="register-submit"
        accessibilityLabel={t("auth.submitRegister")}
        onPress={handleSubmit(onSubmit)}
      >
        {t("auth.submitRegister")}
      </Button>
    </AuthScaffold>
  );
}
