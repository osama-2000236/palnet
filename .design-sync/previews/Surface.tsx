import { Surface } from "@baydar/ui-web";

// The five surface variants are the DS's anti-"everything is a card" rule
// (DESIGN.md). Showing them together is the point of this card.
export const Variants = () => (
  <div style={{ display: "grid", gap: 12, maxWidth: 460 }}>
    <Surface variant="flat" padding="4">
      <span className="text-ink text-sm font-semibold">flat</span>
      <p className="text-ink-muted mt-1 text-sm">حد رفيع، بدون ظل — للأقسام الثانوية.</p>
    </Surface>
    <Surface variant="card" padding="4">
      <span className="text-ink text-sm font-semibold">card</span>
      <p className="text-ink-muted mt-1 text-sm">الوحدة المستقلة — منشور، وظيفة، بطاقة شخص.</p>
    </Surface>
    <Surface variant="hero" padding="4">
      <span className="text-ink text-sm font-semibold">hero</span>
      <p className="text-ink-muted mt-1 text-sm">رأس الصفحة — زوايا أوسع ومحتوى مقصوص.</p>
    </Surface>
    <Surface variant="tinted" padding="4">
      <span className="text-ink text-sm font-semibold">tinted</span>
      <p className="text-ink-muted mt-1 text-sm">خلفية خفيفة بلا حدود — للتلميحات والملخصات.</p>
    </Surface>
    <Surface variant="row" padding="4">
      <span className="text-ink text-sm font-semibold">row</span>
      <p className="text-ink-muted mt-1 text-sm">صف في قائمة — فاصل سفلي فقط.</p>
    </Surface>
  </div>
);

export const PaddingScale = () => (
  <div style={{ display: "grid", gap: 12, maxWidth: 460 }}>
    <Surface variant="card" padding="2">
      <span className="text-ink text-sm">padding=&quot;2&quot;</span>
    </Surface>
    <Surface variant="card" padding="4">
      <span className="text-ink text-sm">padding=&quot;4&quot;</span>
    </Surface>
    <Surface variant="card" padding="6">
      <span className="text-ink text-sm">padding=&quot;6&quot;</span>
    </Surface>
  </div>
);

export const AsListRows = () => (
  <Surface variant="card" padding="0" className="overflow-hidden" as="ul">
    {["الإعدادات العامة", "الخصوصية", "الإشعارات", "اللغة"].map((label) => (
      <Surface key={label} as="li" variant="row" padding="4">
        <span className="text-ink text-sm">{label}</span>
      </Surface>
    ))}
  </Surface>
);
