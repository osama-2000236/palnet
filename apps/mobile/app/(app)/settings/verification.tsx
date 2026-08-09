// Settings → Verification. Native twin of the web page at
// apps/web/src/app/[locale]/(app)/settings/verification/page.tsx.
//
// Same four rows, same two flows, same rule: every badge names what it proves.
// Nothing here renders a generic "verified" mark.

import { OTP_LIMITS, VerificationMethod, toE164, type VerificationState } from "@baydar/shared";
import {
  Banner,
  Button,
  Input,
  Surface,
  VerificationBadge,
  nativeTokens,
  useThemeTokens,
  useToast,
} from "@baydar/ui-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  useConfirmPhoneVerification,
  useMyVerifications,
  useStartEmailDomainVerification,
  useStartPhoneVerification,
} from "@/api/verifications";

const METHODS = [
  VerificationMethod.PHONE,
  VerificationMethod.WORK_EMAIL,
  VerificationMethod.EDU_EMAIL,
  VerificationMethod.PROFESSIONAL_BODY,
] as const;

export default function VerificationSettingsScreen(): JSX.Element {
  const c = useThemeTokens().color;
  const { t } = useTranslation();
  const { showToast } = useToast();

  const mine = useMyVerifications();
  const startPhone = useStartPhoneVerification();
  const confirmPhone = useConfirmPhoneVerification();
  const startEmail = useStartEmailDomainVerification();

  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);

  const byMethod = new Map<string, VerificationState>(
    (mine.data?.verifications ?? []).map((row) => [row.method, row]),
  );

  // Normalised on the client so the member sees the number the code will go to,
  // and so `+970`, `00970` and Arabic-Indic digits all reach the same place.
  const normalised = toE164(phone);

  const heading = {
    color: c.ink,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.h1.size,
    fontWeight: "700" as const,
    textAlign: "auto" as const,
  };
  const subheading = {
    color: c.ink,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.h3.size,
    fontWeight: "600" as const,
    textAlign: "auto" as const,
  };
  const muted = {
    color: c.inkMuted,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.small.size,
    textAlign: "auto" as const,
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.surfaceMuted }}>
      <ScrollView
        contentContainerStyle={{ padding: nativeTokens.space[4], gap: nativeTokens.space[3] }}
      >
        <Text accessibilityRole="header" style={heading}>
          {t("verification.title")}
        </Text>
        <Text style={muted}>{t("verification.subtitle")}</Text>

        <Banner kind="info">{t("verification.notice")}</Banner>

        <Surface variant="card" padding="0">
          {METHODS.map((method, index) => {
            const row = byMethod.get(method);
            return (
              <View
                key={method}
                style={{
                  flexDirection: "row",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: nativeTokens.space[3],
                  padding: nativeTokens.space[4],
                  borderTopWidth: index > 0 ? 1 : 0,
                  borderTopColor: c.lineSoft,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[subheading, { fontSize: nativeTokens.type.scale.small.size }]}>
                    {t(`verification.methods.${method}.title`)}
                  </Text>
                  <Text style={[muted, { fontSize: nativeTokens.type.scale.micro.size }]}>
                    {t(`verification.methods.${method}.proves`)}
                  </Text>
                </View>
                {row?.status === "VERIFIED" ? (
                  <VerificationBadge
                    method={method}
                    label={t(`verification.methods.${method}.badge`)}
                    srLabel={t(`verification.methods.${method}.badgeSpoken`)}
                  />
                ) : (
                  <Text style={[muted, { fontSize: nativeTokens.type.scale.micro.size }]}>
                    {row?.status === "PENDING"
                      ? t("verification.statePending")
                      : t("verification.stateNone")}
                  </Text>
                )}
              </View>
            );
          })}
        </Surface>

        {/* ── Phone ── */}
        <Surface variant="card" padding="4" style={{ gap: nativeTokens.space[3] }}>
          <Text style={subheading}>{t("verification.phone.title")}</Text>
          <Text style={[muted, { fontSize: nativeTokens.type.scale.micro.size }]}>
            {t("verification.phone.help")}
          </Text>

          <Input
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
            value={phone}
            onChangeText={setPhone}
            accessibilityLabel={t("verification.phone.label")}
            placeholder={t("verification.phone.placeholder")}
            helper={normalised ?? undefined}
            error={phone.length > 0 && normalised === null}
            errorMessage={
              phone.length > 0 && normalised === null ? t("verification.phone.invalid") : undefined
            }
          />

          <Button
            variant="primary"
            disabled={!normalised || startPhone.isPending}
            onPress={() => {
              if (!normalised) return;
              startPhone.mutate(
                { phoneE164: normalised },
                {
                  onSuccess: (challenge) => {
                    setSentTo(challenge.phoneTail);
                    showToast({ message: t("verification.phone.sent"), kind: "success" });
                  },
                  onError: () => showToast({ message: t("common.genericError"), kind: "error" }),
                },
              );
            }}
          >
            {t("verification.phone.send")}
          </Button>

          {sentTo ? (
            <View style={{ gap: nativeTokens.space[2] }}>
              <Text style={[muted, { fontSize: nativeTokens.type.scale.micro.size }]}>
                {t("verification.phone.sentTo", { tail: sentTo })}
              </Text>
              <Input
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                maxLength={6}
                value={code}
                onChangeText={setCode}
                accessibilityLabel={t("verification.phone.codeLabel")}
                helper={t("verification.phone.attempts", {
                  value: OTP_LIMITS.MAX_CONFIRM_ATTEMPTS,
                })}
              />
              <Button
                variant="secondary"
                disabled={code.length !== 6 || confirmPhone.isPending}
                onPress={() => {
                  if (!normalised) return;
                  confirmPhone.mutate(
                    { phoneE164: normalised, code },
                    {
                      onSuccess: () => {
                        setSentTo(null);
                        setCode("");
                        showToast({
                          message: t("verification.phone.confirmed"),
                          kind: "success",
                        });
                      },
                      onError: () =>
                        showToast({ message: t("verification.phone.codeWrong"), kind: "error" }),
                    },
                  );
                }}
              >
                {t("verification.phone.confirm")}
              </Button>
            </View>
          ) : null}
        </Surface>

        {/* ── Work or university email ── */}
        <Surface variant="card" padding="4" style={{ gap: nativeTokens.space[3] }}>
          <Text style={subheading}>{t("verification.email.title")}</Text>
          {/* The domain decides which of the two badges this becomes. Letting
              the member choose would let them choose wrong, and EDU_EMAIL is
              worth more. */}
          <Text style={[muted, { fontSize: nativeTokens.type.scale.micro.size }]}>
            {t("verification.email.help")}
          </Text>

          <Input
            keyboardType="email-address"
            autoCapitalize="none"
            textContentType="emailAddress"
            value={email}
            onChangeText={setEmail}
            accessibilityLabel={t("verification.email.label")}
            placeholder={t("verification.email.placeholder")}
          />

          <Button
            variant="primary"
            disabled={!email.includes("@") || startEmail.isPending}
            onPress={() =>
              startEmail.mutate(
                { email },
                {
                  onSuccess: () =>
                    showToast({ message: t("verification.email.sent"), kind: "success" }),
                  onError: () => showToast({ message: t("common.genericError"), kind: "error" }),
                },
              )
            }
          >
            {t("verification.email.send")}
          </Button>
        </Surface>
      </ScrollView>
    </SafeAreaView>
  );
}
