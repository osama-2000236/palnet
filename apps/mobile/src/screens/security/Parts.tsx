// Pieces of settings/security — native twins of
// apps/web/.../settings/security/_components/SecuritySettingsParts.tsx.
// Split out so the screen file stays under the 300-LOC route cap (qa:design).

import { formatRelativeTime, formatUserAgent, type ActiveSession } from "@baydar/shared";
import { Button, Input, nativeTokens, useThemeTokens, type NativeTheme } from "@baydar/ui-native";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";

export function PasswordField({
  label,
  value,
  onChangeText,
  autoComplete,
  helperText,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  autoComplete: "current-password" | "new-password";
  helperText?: string;
}): JSX.Element {
  const styles = useStyles();
  const { t } = useTranslation();
  const [reveal, setReveal] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.revealRow}>
        <Input
          style={styles.grow}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!reveal}
          autoComplete={autoComplete}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel={label}
          helperText={helperText}
          inputStyle={styles.ltr}
        />
        <Button
          variant="ghost"
          size="sm"
          onPress={() => setReveal((r) => !r)}
          accessibilityLabel={
            reveal
              ? t("settings.security.password.hidePassword")
              : t("settings.security.password.showPassword")
          }
        >
          {reveal ? t("settings.security.password.hide") : t("settings.security.password.show")}
        </Button>
      </View>
    </View>
  );
}

export function SessionRow({
  session,
  isThisDevice,
  onSignOut,
}: {
  session: ActiveSession;
  isThisDevice: boolean;
  onSignOut: () => void;
}): JSX.Element {
  const styles = useStyles();
  const { i18n, t } = useTranslation();
  const device = formatUserAgent(session.device) ?? t("settings.security.sessions.unknownDevice");
  return (
    <View style={styles.sessionRow}>
      <View style={styles.sessionText}>
        <View style={styles.sessionTitleRow}>
          <Text numberOfLines={1} style={styles.sessionDevice}>
            {device}
          </Text>
          {isThisDevice ? (
            <Text style={styles.thisDevice}>{t("settings.security.sessions.thisDevice")}</Text>
          ) : null}
        </View>
        <Text style={styles.sessionMeta}>
          {t("settings.security.sessions.lastActive", {
            when: formatRelativeTime(session.lastActiveAt, i18n.language),
          })}
        </Text>
      </View>
      <Button
        variant="ghost"
        size="sm"
        onPress={onSignOut}
        accessibilityLabel={
          isThisDevice
            ? t("settings.security.sessions.signOutThis")
            : t("settings.security.sessions.signOut")
        }
      >
        {isThisDevice
          ? t("settings.security.sessions.signOutThis")
          : t("settings.security.sessions.signOut")}
      </Button>
    </View>
  );
}

function makeStyles(c: NativeTheme["color"]) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.surfaceMuted },
    scrollBody: {
      padding: nativeTokens.space[4],
      gap: nativeTokens.space[4],
      paddingBottom: nativeTokens.space[10],
    },
    headerBlock: { gap: nativeTokens.space[1] },
    title: {
      color: c.ink,
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.h1.size,
      lineHeight: nativeTokens.type.scale.h1.line,
      fontWeight: "700",
      textAlign: "auto",
    },
    subtitle: {
      color: c.inkMuted,
      fontFamily: nativeTokens.type.family.body,
      fontSize: nativeTokens.type.scale.small.size,
      lineHeight: nativeTokens.type.scale.small.line,
      textAlign: "auto",
    },
    card: { gap: nativeTokens.space[3] },
    sectionHead: { gap: nativeTokens.space[1] },
    sectionTitle: {
      color: c.ink,
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.body.size,
      lineHeight: nativeTokens.type.scale.body.line,
      fontWeight: "700",
      textAlign: "auto",
    },
    sectionDesc: {
      color: c.inkMuted,
      fontFamily: nativeTokens.type.family.body,
      fontSize: nativeTokens.type.scale.small.size,
      lineHeight: nativeTokens.type.scale.small.line,
      textAlign: "auto",
    },
    chipRow: { flexDirection: "row", flexWrap: "wrap", gap: nativeTokens.space[2] },
    field: { gap: nativeTokens.space[1] },
    fieldLabel: {
      color: c.ink,
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.caption.size,
      lineHeight: nativeTokens.type.scale.caption.line,
      fontWeight: "700",
      textAlign: "auto",
    },
    revealRow: { flexDirection: "row", alignItems: "flex-start", gap: nativeTokens.space[2] },
    grow: { flex: 1 },
    ltr: {
      // eslint-disable-next-line no-restricted-syntax -- paired with writingDirection ltr: a password is a Latin secret and RTL puts the caret on the wrong side.
      textAlign: "left",
      writingDirection: "ltr",
    },
    sessionRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: nativeTokens.space[3],
      paddingVertical: nativeTokens.space[3],
      borderTopWidth: 1,
      borderTopColor: c.lineSoft,
    },
    sessionText: { flex: 1, gap: nativeTokens.space[1] },
    sessionTitleRow: { flexDirection: "row", alignItems: "center", gap: nativeTokens.space[2] },
    sessionDevice: {
      color: c.ink,
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.small.size,
      lineHeight: nativeTokens.type.scale.small.line,
      fontWeight: "600",
      textAlign: "auto",
      flexShrink: 1,
    },
    thisDevice: {
      color: c.brand700,
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.caption.size,
      lineHeight: nativeTokens.type.scale.caption.line,
      fontWeight: "700",
    },
    sessionMeta: {
      color: c.inkMuted,
      fontFamily: nativeTokens.type.family.body,
      fontSize: nativeTokens.type.scale.caption.size,
      lineHeight: nativeTokens.type.scale.caption.line,
      textAlign: "auto",
    },
  });
}

export function useSecurityStyles() {
  const c = useThemeTokens().color;
  return useMemo(() => makeStyles(c), [c]);
}

const useStyles = useSecurityStyles;
