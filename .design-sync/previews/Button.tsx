import { Button, Icon } from "@baydar/ui-web";

export const Variants = () => (
  <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
    <Button variant="primary">انشر</Button>
    <Button variant="secondary">حفظ كمسودة</Button>
    <Button variant="ghost">إلغاء</Button>
    <Button variant="accent">تواصل</Button>
    <Button variant="outline">متابعة</Button>
    <Button variant="danger-ghost">حظر</Button>
  </div>
);

export const Sizes = () => (
  <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
    <Button size="sm">صغير</Button>
    <Button size="md">متوسط</Button>
    <Button size="lg">كبير</Button>
  </div>
);

export const WithIcons = () => (
  <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
    <Button leading={<Icon name="plus" size={16} />}>منشور جديد</Button>
    <Button variant="secondary" trailing={<Icon name="chevron-down" size={16} />}>
      عرض الكل
    </Button>
    <Button variant="ghost" aria-label="خيارات إضافية">
      <Icon name="more" size={16} />
    </Button>
  </div>
);

export const States = () => (
  <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
    <Button loading>جارٍ الإرسال…</Button>
    <Button disabled>غير متاح</Button>
    <Button variant="secondary" disabled>
      غير متاح
    </Button>
  </div>
);

export const FullWidth = () => (
  <div style={{ maxWidth: 320 }}>
    <Button fullWidth>تسجيل الدخول</Button>
  </div>
);
