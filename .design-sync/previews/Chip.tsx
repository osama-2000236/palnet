import { Chip, Icon } from "@baydar/ui-web";

const noop = (): void => undefined;

export const Filters = () => (
  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
    <Chip active onClick={noop}>
      الكل
    </Chip>
    <Chip onClick={noop}>عن بُعد</Chip>
    <Chip onClick={noop}>دوام كامل</Chip>
    <Chip onClick={noop}>رام الله</Chip>
    <Chip onClick={noop}>خبرة ٣+ سنوات</Chip>
  </div>
);

export const Sizes = () => (
  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
    <Chip size="sm">صغير</Chip>
    <Chip size="md">متوسط</Chip>
    <Chip size="sm" active>
      صغير · مفعّل
    </Chip>
  </div>
);

export const Removable = () => (
  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
    <Chip onRemove={noop} removeAriaLabel="إزالة الفلتر: عن بُعد">
      عن بُعد
    </Chip>
    <Chip active onRemove={noop} removeAriaLabel="إزالة الفلتر: نابلس">
      نابلس
    </Chip>
  </div>
);

export const WithLeading = () => (
  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
    <Chip leading={<Icon name="briefcase" size={14} />}>وظائف</Chip>
    <Chip leading={<Icon name="users" size={14} />} active>
      أشخاص
    </Chip>
    <Chip disabled>غير متاح</Chip>
  </div>
);
