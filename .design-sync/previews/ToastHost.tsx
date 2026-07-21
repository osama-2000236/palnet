import { useEffect } from "react";
import { ToastHost, useToast } from "@baydar/ui-web";

// ToastHost is an alias of ToastProvider — same component, kept for hosts that
// mount the toast layer separately from the rest of the app shell.
//
// The toast layer is position:fixed and stacks at the top edge of its
// containing block, which in a preview card is the card itself. So the card
// content sits low and stays narrow to keep clear of it.
function Mounted() {
  const { showToast } = useToast();
  useEffect(() => {
    showToast({ message: "حفظنا مسودتك.", kind: "info", durationMs: 0 });
  }, [showToast]);

  return (
    <div style={{ minHeight: 220, display: "flex", alignItems: "flex-end" }}>
      <p className="text-ink-muted max-w-[320px] text-sm">
        <code dir="ltr">ToastHost</code> === <code dir="ltr">ToastProvider</code> — مرّرها مرة واحدة
        حول الشجرة، وكل ما تحتها يقدر ينادي <code dir="ltr">useToast()</code>.
      </p>
    </div>
  );
}

export const Default = () => (
  <ToastHost dismissLabel="إخفاء التنبيه">
    <Mounted />
  </ToastHost>
);
