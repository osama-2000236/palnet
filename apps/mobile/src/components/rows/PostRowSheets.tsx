// The two sheets a post row can raise: the reaction picker and the report
// form. Split out of PostRow.tsx to keep that file under the qa:design 300-LOC
// ceiling, and because neither has anything to do with the row's layout.

import { ActionSheet, REACTION_TYPES, ReportSheet, type ReactionKind } from "@baydar/ui-native";
import { useTranslation } from "react-i18next";

import { useReport } from "@/api/safety";
import { useReportLabels } from "@/lib/report-labels";

export function PostRowSheets({
  postId,
  reaction,
  pickerOpen,
  reportOpen,
  onPickerClose,
  onReportOpenChange,
  onSetReaction,
  onReported,
  onReportError,
}: {
  postId: string;
  reaction: ReactionKind | null;
  pickerOpen: boolean;
  reportOpen: boolean;
  onPickerClose(): void;
  onReportOpenChange(open: boolean): void;
  onSetReaction(next: ReactionKind | null): void;
  onReported(): void;
  onReportError(): void;
}): JSX.Element {
  const { t } = useTranslation();
  const report = useReport();
  const reportLabels = useReportLabels();

  return (
    <>
      {/* Touch's answer to the web picker's hover-dwell flyout. A vertical list
          of named reactions rather than a row of glyphs: at 44pt each the names
          fit, and "تهنئة" vs "تقدير" is not something to guess from an 18px
          line drawing on a phone. */}
      <ActionSheet
        open={pickerOpen}
        onClose={onPickerClose}
        label={t("post.reactions.pick")}
        closeLabel={t("common.close")}
        items={REACTION_TYPES.map((kind) => ({
          id: kind,
          label: t(`post.reactions.${kind}`),
          onSelect: () => onSetReaction(reaction === kind ? null : kind),
        }))}
      />
      <ReportSheet
        open={reportOpen}
        onOpenChange={onReportOpenChange}
        target={{ kind: "post", id: postId }}
        labels={reportLabels}
        submitting={report.isPending}
        onSubmit={(input) => {
          report.mutate(input, { onSuccess: onReported, onError: onReportError });
        }}
      />
    </>
  );
}
