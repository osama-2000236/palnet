import { Switch } from "@baydar/ui-web";

const noop = (): void => undefined;

const Row = ({ children, label }: { children: React.ReactNode; label: string }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 16,
      maxWidth: 380,
    }}
  >
    <span style={{ fontSize: 14 }}>{label}</span>
    {children}
  </div>
);

export const States = () => (
  <div style={{ display: "grid", gap: 14 }}>
    <Row label="إشعارات الوظائف">
      <Switch checked onChange={noop} ariaLabel="إشعارات الوظائف" />
    </Row>
    <Row label="إشعارات الرسائل">
      <Switch checked={false} onChange={noop} ariaLabel="إشعارات الرسائل" />
    </Row>
    <Row label="الوضع الليلي (قريبًا)">
      <Switch checked={false} onChange={noop} ariaLabel="الوضع الليلي" disabled />
    </Row>
    <Row label="مفعّل ومعطّل">
      <Switch checked onChange={noop} ariaLabel="مفعّل ومعطّل" disabled />
    </Row>
  </div>
);
