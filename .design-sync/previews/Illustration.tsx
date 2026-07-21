import { ILLUSTRATION_MOTIFS, Illustration } from "@baydar/ui-web";

export const Motifs = () => (
  <div style={{ display: "flex", flexWrap: "wrap", gap: 20, alignItems: "center" }}>
    {ILLUSTRATION_MOTIFS.map((motif) => (
      <div key={motif} style={{ display: "grid", gap: 6, justifyItems: "center" }}>
        <Illustration motif={motif} />
        <span className="text-ink-muted text-xs">{motif}</span>
      </div>
    ))}
  </div>
);

export const Directions = () => (
  <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
    <div style={{ display: "grid", gap: 6, justifyItems: "center" }}>
      <Illustration motif="jobs" direction="outline" />
      <span className="text-ink-muted text-xs">outline</span>
    </div>
    <div style={{ display: "grid", gap: 6, justifyItems: "center" }}>
      <Illustration motif="jobs" direction="block" />
      <span className="text-ink-muted text-xs">block</span>
    </div>
    <div style={{ display: "grid", gap: 6, justifyItems: "center" }}>
      <Illustration motif="jobs" direction="harvest" />
      <span className="text-ink-muted text-xs">harvest</span>
    </div>
  </div>
);

export const Sizes = () => (
  <div style={{ display: "flex", gap: 20, alignItems: "flex-end" }}>
    <Illustration motif="network" size="sm" />
    <Illustration motif="network" size="md" />
    <Illustration motif="network" size="lg" />
  </div>
);

export const Tints = () => (
  <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
    <Illustration motif="messages" tint="none" />
    <Illustration motif="messages" tint="sand" />
    <Illustration motif="messages" tint="olive" />
    <Illustration motif="messages" tint="sunken" />
  </div>
);
