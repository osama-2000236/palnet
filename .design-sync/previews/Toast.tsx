import { Toast } from "@baydar/ui-web";

const noop = (): void => undefined;

// `Toast` is the presentational pill. For the real usage — a provider plus a
// `showToast()` hook — see the ToastProvider card.
export const Kinds = () => (
  <div style={{ display: "grid", gap: 10, maxWidth: 400 }}>
    <Toast kind="info" message="حفظنا مسودتك." onDismiss={noop} dismissLabel="إخفاء التنبيه" />
    <Toast kind="success" message="تم نشر منشورك." onDismiss={noop} dismissLabel="إخفاء التنبيه" />
    <Toast
      kind="error"
      message="تعذّر حفظ التغييرات. حاول مرة أخرى."
      onDismiss={noop}
      dismissLabel="إخفاء التنبيه"
    />
  </div>
);

export const LongMessage = () => (
  <div style={{ maxWidth: 400 }}>
    <Toast
      kind="info"
      message="أرسلنا رابط تفعيل إلى بريدك — الرابط صالح لمدة ٢٤ ساعة."
      onDismiss={noop}
      dismissLabel="إخفاء التنبيه"
    />
  </div>
);
