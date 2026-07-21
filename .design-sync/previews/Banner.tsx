import { Banner } from "@baydar/ui-web";

const noop = (): void => undefined;

export const Kinds = () => (
  <div style={{ display: "grid", gap: 8, maxWidth: 560 }}>
    <Banner kind="info">الوضع غير المتصل مفعّل — التغييرات ستُرسل عند عودة الاتصال.</Banner>
    <Banner kind="success">تم إرسال طلبك للوظيفة.</Banner>
    <Banner kind="warning">جلستك ستنتهي خلال ٥ دقائق.</Banner>
    <Banner kind="danger">تعذّر حفظ التغييرات. حاول مرة أخرى.</Banner>
  </div>
);

export const Dismissible = () => (
  <div style={{ maxWidth: 560 }}>
    <Banner kind="info" dismissible onDismiss={noop} dismissLabel="إخفاء الشريط">
      بيدر بالعربية أولًا — يمكنك تغيير اللغة من الإعدادات.
    </Banner>
  </div>
);

export const Assertive = () => (
  <div style={{ maxWidth: 560 }}>
    <Banner kind="danger" live="assertive">
      انقطع الاتصال بالخادم. نحاول إعادة الاتصال…
    </Banner>
  </div>
);
