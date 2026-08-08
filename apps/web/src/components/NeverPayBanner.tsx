"use client";

// "An employer will never ask you for money." The product's one-line promise,
// on every surface where a payment demand could reach a worker.
//
// Non-dismissible by design: `Banner` defaults `dismissible` to false and this
// never passes it. A worker who dismissed it once would never see it again on
// the thread where the demand actually arrives.
//
// Native twin: apps/mobile/src/components/NeverPayBanner.tsx.

import { Banner, Button, ReportDialog } from "@baydar/ui-web";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { useReport } from "@/lib/api/safety";
import { useReportLabels } from "@/lib/report-labels";

export function NeverPayBanner({
  reportUserId,
  className,
}: {
  /** Who a payment demand would be coming from. Omit for a notice-only banner. */
  reportUserId?: string;
  className?: string;
}): JSX.Element {
  const t = useTranslations("safety");
  const labels = useReportLabels();
  const report = useReport();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Banner kind="warning" live="polite">
        <span className={className}>{t("neverPay.body")}</span>
        {reportUserId ? (
          <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
            {t("neverPay.report")}
          </Button>
        ) : null}
      </Banner>
      {reportUserId && open ? (
        <ReportDialog
          open
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
    </>
  );
}
