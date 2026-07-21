import { Icon, Input } from "@baydar/ui-web";

// Input has no `label` prop — the host owns the <label>. Field labels use the
// DS's own utility vocabulary (text-ink, text-sm) so the pairing here is the
// one to copy.
const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="flex flex-col gap-1.5">
    <span className="text-ink text-sm font-medium">{label}</span>
    {children}
  </label>
);

export const Sizes = () => (
  <div style={{ display: "grid", gap: 12, maxWidth: 380 }}>
    <Input size="sm" placeholder="بحث سريع" />
    <Input size="md" placeholder="الاسم الكامل" />
    <Input size="lg" placeholder="البريد الإلكتروني" />
  </div>
);

export const WithLabelAndHelper = () => (
  <div style={{ display: "grid", gap: 16, maxWidth: 380 }}>
    <Field label="المسمى الوظيفي">
      <Input placeholder="مهندسة برمجيات" helper="يظهر تحت اسمك في كل مكان." fullWidth />
    </Field>
    <Field label="الموقع">
      <Input defaultValue="رام الله، فلسطين" fullWidth />
    </Field>
  </div>
);

export const WithError = () => (
  <div style={{ maxWidth: 380 }}>
    <Field label="البريد الإلكتروني">
      <Input
        defaultValue="laila.nassar"
        error
        errorMessage="أدخل بريدًا إلكترونيًا صحيحًا."
        fullWidth
      />
    </Field>
  </div>
);

export const WithAffixes = () => (
  <div style={{ display: "grid", gap: 12, maxWidth: 380 }}>
    <Input placeholder="ابحث عن وظائف أو أشخاص" leading={<Icon name="search" size={16} />} />
    <Input placeholder="أضف رابط ملفك" trailing={<Icon name="check" size={16} />} />
  </div>
);

export const Disabled = () => (
  <div style={{ maxWidth: 380 }}>
    <Field label="اسم المستخدم">
      <Input defaultValue="laila-nassar" disabled fullWidth />
    </Field>
  </div>
);
