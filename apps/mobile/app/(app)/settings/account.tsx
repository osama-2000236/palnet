// Account self-serve — mirrors web /settings/account. Three sections in one
// scroll: change email, change password, delete account. All three share
// the same "enter current password" gate that the API enforces.
//
// Delete + password change both revoke refresh tokens server-side, so we
// locally clear the session + bounce to /login on success.

import { ChangeEmailBody, ChangePasswordBody, DeleteAccountBody } from "@baydar/shared";
import { Button, Surface, nativeTokens } from "@baydar/ui-native";
import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextStyle,
} from "react-native";

import { apiCall, ApiRequestError } from "@/lib/api";
import { clearSession, getAccessToken } from "@/lib/session";

function FieldLabel({ children }: { children: string }): JSX.Element {
  return (
    <Text
      style={{
        color: nativeTokens.color.inkMuted,
        fontSize: nativeTokens.type.scale.small.size,
        fontFamily: nativeTokens.type.family.sans,
      }}
    >
      {children}
    </Text>
  );
}

function input(): { style: StyleProp<TextStyle> } {
  return {
    style: {
      borderWidth: 1,
      borderColor: nativeTokens.color.lineHard,
      borderRadius: nativeTokens.radius.md,
      paddingHorizontal: nativeTokens.space[3],
      paddingVertical: nativeTokens.space[2],
      color: nativeTokens.color.ink,
      backgroundColor: nativeTokens.color.surface,
      fontFamily: nativeTokens.type.family.sans,
    },
  };
}

export default function SettingsAccountScreen(): JSX.Element {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: nativeTokens.color.surfaceMuted }}>
      <ScrollView
        contentContainerStyle={{
          padding: nativeTokens.space[4],
          gap: nativeTokens.space[4],
        }}
      >
        <EmailSection />
        <PasswordSection />
        <DeleteSection />
      </ScrollView>
    </SafeAreaView>
  );
}

function useApi(): (path: string, body: unknown) => Promise<{ ok: boolean; code?: string }> {
  return async (path, body) => {
    const token = await getAccessToken();
    if (!token) return { ok: false, code: "AUTH_UNAUTHORIZED" };
    try {
      await apiCall(path, { method: "POST", token, body });
      return { ok: true };
    } catch (e) {
      const code = e instanceof ApiRequestError ? e.code : "INTERNAL";
      return { ok: false, code };
    }
  };
}

function EmailSection(): JSX.Element {
  const { t } = useTranslation();
  const call = useApi();
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function submit(): Promise<void> {
    setErr(null);
    setOk(false);
    const parsed = ChangeEmailBody.safeParse({ newEmail, currentPassword });
    if (!parsed.success) {
      setErr(t("settings.invalidInput", { defaultValue: "Check your inputs." }));
      return;
    }
    setBusy(true);
    const res = await call("/account/email", parsed.data);
    setBusy(false);
    if (res.ok) {
      setOk(true);
      setCurrentPassword("");
    } else setErr(t(`auth.errors.${res.code}`, { defaultValue: t("common.genericError") }));
  }

  return (
    <Surface variant="card" padding="4">
      <View style={{ gap: nativeTokens.space[2] }}>
        <Text
          style={{
            fontSize: nativeTokens.type.scale.h3.size,
            fontWeight: "700",
            color: nativeTokens.color.ink,
            fontFamily: nativeTokens.type.family.sans,
          }}
        >
          {t("settings.changeEmail", { defaultValue: "Change email" })}
        </Text>
        <FieldLabel>{t("settings.newEmail", { defaultValue: "New email" })}</FieldLabel>
        <TextInput
          value={newEmail}
          onChangeText={setNewEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          {...input()}
        />
        <FieldLabel>
          {t("settings.currentPassword", { defaultValue: "Current password" })}
        </FieldLabel>
        <TextInput
          value={currentPassword}
          onChangeText={setCurrentPassword}
          secureTextEntry
          {...input()}
        />
        {err ? (
          <Text style={{ color: nativeTokens.color.danger }} accessibilityRole="alert">
            {err}
          </Text>
        ) : null}
        {ok ? (
          <Text style={{ color: nativeTokens.color.success }}>
            {t("settings.emailUpdated", {
              defaultValue: "Email changed. Verify the new address.",
            })}
          </Text>
        ) : null}
        <Button onPress={submit} disabled={busy} variant="primary">
          {t("common.save", { defaultValue: "Save" })}
        </Button>
      </View>
    </Surface>
  );
}

function PasswordSection(): JSX.Element {
  const { t } = useTranslation();
  const call = useApi();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(): Promise<void> {
    setErr(null);
    const parsed = ChangePasswordBody.safeParse({ currentPassword, newPassword });
    if (!parsed.success) {
      setErr(
        t("settings.passwordTooShort", {
          defaultValue: "Password must be at least 8 characters.",
        }),
      );
      return;
    }
    setBusy(true);
    const res = await call("/account/password", parsed.data);
    setBusy(false);
    if (res.ok) {
      // Server revoked all refresh tokens — local session is now dead.
      await clearSession();
      router.replace("/(auth)/login");
    } else setErr(t(`auth.errors.${res.code}`, { defaultValue: t("common.genericError") }));
  }

  return (
    <Surface variant="card" padding="4">
      <View style={{ gap: nativeTokens.space[2] }}>
        <Text
          style={{
            fontSize: nativeTokens.type.scale.h3.size,
            fontWeight: "700",
            color: nativeTokens.color.ink,
            fontFamily: nativeTokens.type.family.sans,
          }}
        >
          {t("settings.changePassword", { defaultValue: "Change password" })}
        </Text>
        <FieldLabel>
          {t("settings.currentPassword", { defaultValue: "Current password" })}
        </FieldLabel>
        <TextInput
          value={currentPassword}
          onChangeText={setCurrentPassword}
          secureTextEntry
          {...input()}
        />
        <FieldLabel>{t("settings.newPassword", { defaultValue: "New password" })}</FieldLabel>
        <TextInput value={newPassword} onChangeText={setNewPassword} secureTextEntry {...input()} />
        {err ? (
          <Text style={{ color: nativeTokens.color.danger }} accessibilityRole="alert">
            {err}
          </Text>
        ) : null}
        <Button onPress={submit} disabled={busy} variant="primary">
          {t("settings.updatePassword", { defaultValue: "Update password" })}
        </Button>
      </View>
    </Surface>
  );
}

function DeleteSection(): JSX.Element {
  const { t } = useTranslation();
  const call = useApi();
  const [currentPassword, setCurrentPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(): Promise<void> {
    const parsed = DeleteAccountBody.safeParse({ currentPassword, confirmation });
    if (!parsed.success) {
      setErr(
        t("settings.deleteTypeDelete", {
          defaultValue: "Type DELETE to confirm.",
        }),
      );
      return;
    }
    Alert.alert(
      t("settings.deleteConfirmTitle", { defaultValue: "Delete account?" }),
      t("settings.deleteConfirmBody", {
        defaultValue:
          "This deactivates your profile and frees your email. This action cannot be undone.",
      }),
      [
        { text: t("common.cancel", { defaultValue: "Cancel" }), style: "cancel" },
        {
          text: t("settings.deleteConfirmCta", { defaultValue: "Delete" }),
          style: "destructive",
          onPress: async () => {
            setErr(null);
            setBusy(true);
            const res = await call("/account", parsed.data);
            setBusy(false);
            if (res.ok) {
              await clearSession();
              router.replace("/(auth)/login");
            } else
              setErr(
                t(`auth.errors.${res.code}`, {
                  defaultValue: t("common.genericError"),
                }),
              );
          },
        },
      ],
    );
  }

  return (
    <Surface variant="card" padding="4">
      <View style={{ gap: nativeTokens.space[2] }}>
        <Text
          style={{
            fontSize: nativeTokens.type.scale.h3.size,
            fontWeight: "700",
            color: nativeTokens.color.danger,
            fontFamily: nativeTokens.type.family.sans,
          }}
        >
          {t("settings.deleteAccount", { defaultValue: "Delete account" })}
        </Text>
        <Text
          style={{
            color: nativeTokens.color.inkMuted,
            fontSize: nativeTokens.type.scale.small.size,
            fontFamily: nativeTokens.type.family.sans,
          }}
        >
          {t("settings.deleteAccountHint", {
            defaultValue: "Type DELETE to confirm and enter your password.",
          })}
        </Text>
        <FieldLabel>
          {t("settings.currentPassword", { defaultValue: "Current password" })}
        </FieldLabel>
        <TextInput
          value={currentPassword}
          onChangeText={setCurrentPassword}
          secureTextEntry
          {...input()}
        />
        <FieldLabel>DELETE</FieldLabel>
        <TextInput
          value={confirmation}
          onChangeText={setConfirmation}
          autoCapitalize="characters"
          {...input()}
        />
        {err ? (
          <Text style={{ color: nativeTokens.color.danger }} accessibilityRole="alert">
            {err}
          </Text>
        ) : null}
        <Button onPress={submit} disabled={busy} variant="danger-ghost">
          {t("settings.deleteConfirmCta", { defaultValue: "Delete my account" })}
        </Button>
      </View>
    </Surface>
  );
}
