import { type Message } from "@baydar/shared";
import { Button, Input, ReportSheet, Sheet, nativeTokens, useThemeTokens } from "@baydar/ui-native";
import { useTranslation } from "react-i18next";

import { useReport } from "@/api/safety";
import { apiErrorMessage } from "@/lib/api-errors";
import { useReportLabels } from "@/lib/report-labels";

export function MessageThreadSheets({
  actionMessage,
  reportMessage,
  editingBody,
  onEditingBodyChange,
  onCloseActions,
  onSaveEdit,
  onDeleteSelected,
  onCloseReport,
  onError,
}: {
  actionMessage: Message | null;
  reportMessage: Message | null;
  editingBody: string;
  onEditingBodyChange(value: string): void;
  onCloseActions(): void;
  onSaveEdit(): void;
  onDeleteSelected(): void;
  onCloseReport(): void;
  onError(message: string): void;
}): JSX.Element {
  const c = useThemeTokens().color;
  const { t } = useTranslation();
  const report = useReport();
  const reportLabels = useReportLabels();

  return (
    <>
      <Sheet
        open={Boolean(actionMessage)}
        onClose={onCloseActions}
        title={t("messaging.edit.sheetTitle")}
        closeLabel={t("common.cancel", { defaultValue: "إلغاء" })}
      >
        <Input
          fullWidth
          value={editingBody}
          onChangeText={onEditingBodyChange}
          multiline
          maxLength={5000}
          placeholder={t("messaging.composePlaceholder")}
          inputStyle={{
            minHeight: nativeTokens.space[24],
            color: c.ink,
            fontFamily: nativeTokens.type.family.sans,
            fontSize: nativeTokens.type.scale.body.size,
            textAlignVertical: "top",
          }}
        />
        <Button fullWidth disabled={editingBody.trim().length === 0} onPress={onSaveEdit}>
          {t("messaging.edit.save")}
        </Button>
        <Button fullWidth variant="danger-ghost" onPress={onDeleteSelected}>
          {t("messaging.delete.action")}
        </Button>
      </Sheet>
      {reportMessage ? (
        <ReportSheet
          open
          onOpenChange={(next) => {
            if (!next) onCloseReport();
          }}
          target={{ kind: "message", id: reportMessage.id }}
          labels={reportLabels}
          submitting={report.isPending}
          onSubmit={(input) => {
            report.mutate(input, {
              onSuccess: onCloseReport,
              onError: (caught) => onError(apiErrorMessage(t, caught)),
            });
          }}
        />
      ) : null}
    </>
  );
}

// expo-router colocation: not a screen.
export default (): null => null;
