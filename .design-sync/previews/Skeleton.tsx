import { Skeleton, Surface } from "@baydar/ui-web";

export const Kinds = () => (
  <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
    <Skeleton kind="circle" width={40} height={40} />
    <Skeleton kind="rect" width={200} height={14} />
    <Skeleton kind="pill" width={90} height={26} />
  </div>
);

// The pattern this component exists for: a loading placeholder shaped like the
// row it replaces, so nothing shifts when the data lands.
export const PersonRowLoading = () => (
  <Surface variant="card" padding="4" className="max-w-[420px]">
    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
      <Skeleton kind="circle" width={40} height={40} />
      <div style={{ display: "grid", gap: 8, flex: 1 }}>
        <Skeleton width="60%" height={13} />
        <Skeleton width="40%" height={11} />
      </div>
      <Skeleton kind="pill" width={72} height={28} />
    </div>
  </Surface>
);

export const TextBlock = () => (
  <div style={{ display: "grid", gap: 8, maxWidth: 420 }}>
    <Skeleton width="92%" height={13} />
    <Skeleton width="86%" height={13} />
    <Skeleton width="54%" height={13} />
  </div>
);
