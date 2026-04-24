// ReportDialog — bottom-sheet form for filing a report on mobile.
// Mirrors apps/web/src/components/ReportDialog in behaviour: controlled
// open/onClose, caller owns the target (kind + id), no routing or toasts
// here.

import { ReportReason, type ReportTargetKind } from "@palnet/shared";
import { Button, Sheet, nativeTokens } from "@palnet/ui-native";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, Text, TextInput, View } from "react-native";
import { z } from "zod";

import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/session";

type Reason = (typeof ReportReason)[keyof typeof ReportReason];

const ReasonOrder: Reason[] = [
  ReportReason.SPAM,
  ReportReason.HARASSMENT,
  ReportReason.HATE_SPEECH,
  ReportReason.VIOLENCE,
  ReportReason.ADULT_CONTENT,
  ReportReason.IMPERSONATION,
  ReportReason.OTHER,
];

const AckSchema = z.object({ id: z.string(), createdAt: z.string() });

export function ReportDialog({
  open,
  onClose,
  targetKind,
  targetId,
}: {
  open: boolean;
  onClose: () => void;
  targetKind: ReportTargetKind;
  targetId: string;
}): JSX.Element {
  const { t } = useTranslation();
  const [reason, setReason] = useState<Reason>(ReportReason.SPAM);
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");

  // Reset whenever the sheet reopens on a new target.
  useEffect(() => {
    if (!open) return;
    setReason(ReportReason.SPAM);
    setDetails("");
    setBusy(false);
    setStatus("idle");
  }, [open]);

  async function submit(): Promise<void> {
    const token = await getAccessToken();
    if (!token) return;
    setBusy(true);
    setStatus("idle");
    try {
      await apiFetch("/reports", AckSchema, {
        method: "POST",
        token,
        body: {
          targetKind,
          targetId,
          reason,
          details: details.trim() ? details.trim() : undefined,
        },
      });
      setStatus("ok");
    } catch {
      setStatus("error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t("moderation.reportDialog.title")}
      closeLabel={t("common.cancel")}
    >
      <View style={{ gap: nativeTokens.space[3] }} testID="report-dialog">
        <Text
          style={{
            color: nativeTokens.color.inkMuted,
            fontFamily: nativeTokens.type.family.sans,
            fontSize: nativeTokens.type.scale.small.size,
          }}
        >
          {t("moderation.reportDialog.subtitle")}
        </Text>

        {status === "ok" ? (
          <View
            style={{
              borderWidth: 1,
              borderColor: nativeTokens.color.brand200,
              backgroundColor: nativeTokens.color.brand50,
              padding: nativeTokens.space[3],
              borderRadius: nativeTokens.radius.md,
              gap: nativeTokens.space[1],
            }}
            testID="report-dialog-success"
          >
            <Text
              style={{
                color: nativeTokens.color.brand700,
                fontFamily: nativeTokens.type.family.sans,
                fontWeight: "700",
              }}
            >
              {t("moderation.reportDialog.successTitle")}
            </Text>
            <Text
              style={{
                color: nativeTokens.color.brand700,
                fontFamily: nativeTokens.type.family.sans,
                fontSize: nativeTokens.type.scale.small.size,
              }}
            >
              {t("moderation.reportDialog.successBody")}
            </Text>
          </View>
        ) : (
          <View
            style={{ gap: nativeTokens.space[2] }}
            accessibilityRole="radiogroup"
            accessibilityLabel={t("moderation.reportDialog.reasonLegend")}
          >
            <Text
              style={{
                color: nativeTokens.color.ink,
                fontFamily: nativeTokens.type.family.sans,
                fontWeight: "700",
                fontSize: nativeTokens.type.scale.small.size,
              }}
            >
              {t("moderation.reportDialog.reasonLegend")}
            </Text>
            {ReasonOrder.map((r) => (
              <ReasonRow
                key={r}
                reason={r}
                selected={reason === r}
                label={t(`moderation.reportDialog.reasons.${r}`)}
                onPress={() => setReason(r)}
              />
            ))}
          </View>
        )}

        {status !== "ok" ? (
          <View style={{ gap: nativeTokens.space[1] }}>
            <Text
              style={{
                color: nativeTokens.color.ink,
                fontFamily: nativeTokens.type.family.sans,
                fontWeight: "700",
                fontSize: nativeTokens.type.scale.small.size,
              }}
            >
              {t("moderation.reportDialog.detailsLabel")}
            </Text>
            <TextInput
              value={details}
              onChangeText={setDetails}
              placeholder={t("moderation.reportDialog.detailsPlaceholder")}
              placeholderTextColor={nativeTokens.color.inkMuted}
              multiline
              numberOfLines={3}
              maxLength={1000}
              style={{
                borderWidth: 1,
                borderColor: nativeTokens.color.lineSoft,
                borderRadius: nativeTokens.radius.md,
                paddingHorizontal: nativeTokens.space[3],
                paddingVertical: nativeTokens.space[2],
                color: nativeTokens.color.ink,
                fontFamily: nativeTokens.type.family.sans,
                minHeight: 80,
                textAlignVertical: "top",
              }}
              testID="report-dialog-details"
            />
          </View>
        ) : null}

        {status === "error" ? (
          <Text
            testID="report-dialog-error"
            style={{
              color: nativeTokens.color.danger,
              fontFamily: nativeTokens.type.family.sans,
              fontSize: nativeTokens.type.scale.small.size,
            }}
          >
            {t("moderation.reportDialog.genericError")}
          </Text>
        ) : null}

        <View
          style={{
            flexDirection: "row",
            justifyContent: "flex-end",
            gap: nativeTokens.space[2],
            marginTop: nativeTokens.space[2],
          }}
        >
          {status === "ok" ? (
            <Button variant="secondary" onPress={onClose}>
              {t("common.done")}
            </Button>
          ) : (
            <>
              <Button variant="ghost" onPress={onClose} disabled={busy}>
                {t("common.cancel")}
              </Button>
              <Button
                onPress={() => void submit()}
                loading={busy}
                testID="report-dialog-submit"
              >
                {t("moderation.reportDialog.submit")}
              </Button>
            </>
          )}
        </View>
      </View>
    </Sheet>
  );
}

function ReasonRow({
  reason: _reason,
  selected,
  label,
  onPress,
}: {
  reason: Reason;
  selected: boolean;
  label: string;
  onPress: () => void;
}): JSX.Element {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: nativeTokens.space[2],
        paddingVertical: nativeTokens.space[2],
      }}
    >
      <View
        style={{
          width: 18,
          height: 18,
          borderRadius: 9,
          borderWidth: 2,
          borderColor: selected
            ? nativeTokens.color.brand600
            : nativeTokens.color.lineHard,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {selected ? (
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: nativeTokens.color.brand600,
            }}
          />
        ) : null}
      </View>
      <Text
        style={{
          color: nativeTokens.color.ink,
          fontFamily: nativeTokens.type.family.sans,
          fontSize: nativeTokens.type.scale.body.size,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
