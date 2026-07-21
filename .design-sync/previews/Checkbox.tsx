import { Checkbox } from "@baydar/ui-web";

const noop = (): void => undefined;

export const Default = () => (
  <div style={{ display: "grid", gap: 12, maxWidth: 420 }}>
    <Checkbox label="أبحث عن فرص عمل" checked onChange={noop} />
    <Checkbox label="أظهر للجميع في نتائج البحث" checked={false} onChange={noop} />
    <Checkbox label="غير متاح الآن" disabled />
  </div>
);

export const WithHelper = () => (
  <div style={{ maxWidth: 420 }}>
    <Checkbox
      label="إشعارات البريد"
      helper="نرسل ملخصًا أسبوعيًا للوظائف المطابقة لخبرتك."
      checked
      onChange={noop}
    />
  </div>
);

export const Indeterminate = () => (
  <div style={{ maxWidth: 420 }}>
    <Checkbox label="كل الإشعارات" indeterminate onChange={noop} />
  </div>
);

export const WithError = () => (
  <div style={{ maxWidth: 420 }}>
    <Checkbox
      label="أوافق على الشروط والأحكام"
      error
      errorMessage="لازم توافق على الشروط قبل المتابعة."
      checked={false}
      onChange={noop}
    />
  </div>
);
