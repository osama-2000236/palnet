import { useToast } from "@baydar/ui-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { exportCv } from "@/lib/cv";

/**
 * The CV export button's state and its three outcomes.
 *
 * Its own hook because the screen it lives on is at the 300-LOC ceiling and
 * this is the part that is not layout: a busy flag, a share sheet that may not
 * exist on the device, and a failure that has to say so rather than silently
 * doing nothing.
 */
export function useCvExport(): { exporting: boolean; run: (handle: string) => void } {
  const { i18n, t } = useTranslation();
  const { showToast } = useToast();
  const [exporting, setExporting] = useState(false);

  function run(handle: string): void {
    setExporting(true);
    void exportCv(handle, i18n.language)
      .then((result) => {
        // Sharing is unavailable on some Android builds and on the simulator.
        // Saying so beats a button that appears to do nothing.
        if (result === "sharing-unavailable") {
          showToast({ message: t("cv.sharingUnavailable"), kind: "error" });
        }
      })
      .catch(() => showToast({ message: t("cv.error"), kind: "error" }))
      .finally(() => setExporting(false));
  }

  return { exporting, run };
}
