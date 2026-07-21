import { useEffect } from "react";
import { Button, Surface, ToastProvider, useToast } from "@baydar/ui-web";

// The real usage: wrap the app once, then call showToast() from anywhere.
// The preview fires one on mount so the card shows the toast, not an empty
// provider (durationMs: 0 keeps it from auto-dismissing mid-screenshot).
function Trigger({ kind, message }: { kind: "info" | "success" | "error"; message: string }) {
  const { showToast } = useToast();
  useEffect(() => {
    showToast({ message, kind, durationMs: 0 });
  }, [kind, message, showToast]);

  return (
    <Surface variant="card" padding="4" className="max-w-[420px]">
      <p className="text-ink mb-3 text-sm">
        أي شيء داخل <code dir="ltr">ToastProvider</code> يقدر ينادي{" "}
        <code dir="ltr">useToast().showToast(…)</code>.
      </p>
      <Button size="sm" onClick={() => showToast({ message, kind })}>
        أظهر تنبيهًا
      </Button>
    </Surface>
  );
}

export const Success = () => (
  <ToastProvider dismissLabel="إخفاء التنبيه">
    <Trigger kind="success" message="تم نشر منشورك." />
  </ToastProvider>
);

export const ErrorToast = () => (
  <ToastProvider dismissLabel="إخفاء التنبيه">
    <Trigger kind="error" message="تعذّر حفظ التغييرات. حاول مرة أخرى." />
  </ToastProvider>
);
