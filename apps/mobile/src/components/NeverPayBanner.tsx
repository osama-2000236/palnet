// "An employer will never ask you for money." The product's one-line promise,
// on every surface where a payment demand could reach a worker.
//
// Non-dismissible by design: `Banner` defaults `dismissible` to false and this
// never passes it. A worker who dismissed it once would never see it again on
// the thread where the demand actually arrives.
//
// Web twin: apps/web/src/components/NeverPayBanner.tsx.

import { Banner, Button, ReportSheet } from "@baydar/ui-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";

import { useReport } from "@/api/safety";
import { useReportLabels } from "@/lib/report-labels";

export function NeverPayBanner({
  reportUserId,
}: {
  /** Who a payment demand would be coming from. Omit for a notice-only banner. */
  reportUserId?: string;
}): JSX.Element {
  const { t } = useTranslation();
  const labels = useReportLabels();
  const report = useReport();
  const [open, setOpen] = useState(false);

  return (
    <View>
      <Banner kind="warning">{t("safety.neverPay.body")}</Banner>
      {reportUserId ? (
        <Button variant="ghost" size="sm" onPress={() => setOpen(true)}>
          {t("safety.neverPay.report")}
        </Button>
      ) : null}
      {reportUserId ? (
        <ReportSheet
          open={open}
          onOpenChange={setOpen}
          target={{ kind: "user", id: reportUserId }}
          // One tap from the banner to a filed report: the reason is already
          // known, so the user never hunts for the right radio.
          initialReason="FEE_REQUEST"
          labels={labels}
          submitting={report.isPending}
          onSubmit={(input) => report.mutate(input, { onSuccess: () => setOpen(false) })}
        />
      ) : null}
    </View>
  );
}
