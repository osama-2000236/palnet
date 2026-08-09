import { Button, Checkbox, Surface, nativeTokens, useThemeTokens } from "@baydar/ui-native";
import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import { useState } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { z } from "zod";

import {
  AuthError,
  AuthFooterLink,
  AuthScaffold,
  AuthTextField,
} from "@/components/auth/AuthScaffold";
import { ApiRequestError, registerAction } from "@/lib/auth-actions";
import { legalUrl } from "@/lib/linking";
import { useNetworkStore } from "@/store/network";

interface RegisterFormValues {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  acceptTerms: boolean;
}

const registerSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, "auth.validation.required")
    .max(60, "auth.validation.nameMax"),
  lastName: z.string().trim().min(1, "auth.validation.required").max(60, "auth.validation.nameMax"),
  email: z.string().trim().min(1, "auth.validation.required").email("auth.validation.email"),
  // Mirrors `Password` in @baydar/shared — one policy, not a laxer client one.
  password: z
    .string()
    .min(10, "auth.validation.passwordMin")
    .regex(/[a-z]/, "auth.validation.passwordLower")
    .regex(/[A-Z]/, "auth.validation.passwordUpper")
    .regex(/\d/, "auth.validation.passwordDigit"),
  acceptTerms: z.boolean().refine((v) => v, "auth.validation.terms"),
});

export default function RegisterScreen(): JSX.Element {
  const { i18n, t } = useTranslation();
  // Resolved at render, never at module scope: a StyleSheet.create colour is
  // frozen to the light palette and would stay dark-on-dark (lint:tokens r.4).
  const c = useThemeTokens().color;
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
    resolver: zodResolver(registerSchema) as Resolver<RegisterFormValues>,
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
        {/* Web's register uses Checkbox for this field; mobile used a raw RN
            Switch, which is the wrong control for consent and bypassed the kit
            entirely. Same component on both platforms now. */}
        <Checkbox
          checked={accept}
          onChange={(value) =>
            setValue("acceptTerms", value, { shouldDirty: true, shouldValidate: true })
          }
          disabled={isSubmitting}
          label={t("auth.acceptTerms")}
          ariaLabel={t("auth.acceptTerms")}
          error={!!errors.acceptTerms}
          errorMessage={errors.acceptTerms?.message ? t(errors.acceptTerms.message) : undefined}
          testID="register-accept-terms"
        />
        {/* The consent was enforced and the documents were unreachable — web has
            had both links since #114, mobile had none, which is an app-store
            problem rather than a UX nit. Linking out rather than bundling a
            second copy: two copies of a legal document drift. */}
        <View style={styles.legalRow}>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={t("auth.termsLink")}
            hitSlop={8}
            style={styles.legalHit}
            onPress={() => void Linking.openURL(legalUrl("tos", i18n.language))}
          >
            <Text style={[styles.legalLink, { color: c.brand700 }]}>{t("auth.termsLink")}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={t("auth.privacyLink")}
            hitSlop={8}
            style={styles.legalHit}
            onPress={() => void Linking.openURL(legalUrl("privacy", i18n.language))}
          >
            <Text style={[styles.legalLink, { color: c.brand700 }]}>{t("auth.privacyLink")}</Text>
          </Pressable>
        </View>
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

const styles = StyleSheet.create({
  legalRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: nativeTokens.space[4],
    marginTop: nativeTokens.space[2],
  },
  // 44pt minimum hit target — MOBILE.md, non-negotiable.
  legalHit: { minHeight: 44, justifyContent: "center" },
  legalLink: {
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.small.size,
    fontWeight: "600",
    textDecorationLine: "underline",
    textAlign: "auto",
  },
});
