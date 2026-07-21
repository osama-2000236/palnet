import { Icon } from "@baydar/ui-web";

const NAMES = [
  "bell",
  "bookmark",
  "briefcase",
  "building",
  "calendar",
  "check",
  "check-double",
  "chevron-down",
  "clock",
  "comment",
  "gear",
  "home",
  "image",
  "logo",
  "message",
  "more",
  "plus",
  "repost",
  "search",
  "send",
  "send-paper",
  "share",
  "thumb",
  "users",
  "video",
  "x",
  "employer",
] as const;

export const AllGlyphs = () => (
  <div style={{ display: "flex", flexWrap: "wrap", gap: 18 }}>
    {NAMES.map((name) => (
      <div key={name} style={{ display: "grid", gap: 4, justifyItems: "center", width: 74 }}>
        <Icon name={name} size={22} />
        <span className="text-ink-muted text-[10px]" dir="ltr">
          {name}
        </span>
      </div>
    ))}
  </div>
);

export const Sizes = () => (
  <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
    <Icon name="briefcase" size={14} />
    <Icon name="briefcase" size={18} />
    <Icon name="briefcase" size={24} />
    <Icon name="briefcase" size={32} />
  </div>
);

// Icons inherit color from the parent — never pass a hex.
export const InheritsColor = () => (
  <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
    <span className="text-ink">
      <Icon name="bell" size={22} />
    </span>
    <span className="text-ink-muted">
      <Icon name="bell" size={22} />
    </span>
    <span className="text-brand-600">
      <Icon name="bell" size={22} />
    </span>
    <span className="text-danger">
      <Icon name="bell" size={22} />
    </span>
  </div>
);

export const Labelled = () => (
  <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
    <Icon name="logo" size={28} title="شعار بيدر" />
    <Icon name="check-double" size={22} title="تم التسليم والقراءة" />
  </div>
);
