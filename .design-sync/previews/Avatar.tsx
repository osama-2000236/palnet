import { Avatar } from "@baydar/ui-web";

const laila = { id: "u_1", handle: "laila-nassar", firstName: "ليلى", lastName: "نصار" };
const omar = { id: "u_2", handle: "omar-h", firstName: "عمر", lastName: "حجازي" };
const rana = { id: "u_3", handle: "rana-k", firstName: "رنا", lastName: "خليل" };
const yousef = { id: "u_4", handle: "yousef-a", firstName: "يوسف", lastName: "عابد" };
const nour = { id: "u_5", handle: "nour-s", firstName: "نور", lastName: "سلامة" };

export const Sizes = () => (
  <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
    <Avatar user={laila} size="xs" />
    <Avatar user={laila} size="sm" />
    <Avatar user={laila} size="md" />
    <Avatar user={laila} size="lg" />
    <Avatar user={laila} size="xl" />
  </div>
);

export const Palettes = () => (
  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
    <Avatar user={laila} size="lg" />
    <Avatar user={omar} size="lg" />
    <Avatar user={rana} size="lg" />
    <Avatar user={yousef} size="lg" />
    <Avatar user={nour} size="lg" />
  </div>
);

export const RingAndOnline = () => (
  <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
    <Avatar user={laila} size="lg" ring />
    <Avatar user={omar} size="lg" online />
    <Avatar user={rana} size="lg" ring online />
  </div>
);

// `user={null}` renders nothing at all (Avatar returns null) — so the cases
// worth showing are: a photo, and the initials fallback when there's no photo
// and no name (handle seeds the palette).
export const PhotoAndFallback = () => (
  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
    <Avatar
      size="lg"
      user={{
        id: "u_9",
        firstName: "سلمى",
        lastName: "درويش",
        avatarUrl:
          "data:image/svg+xml;utf8," +
          encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" width="112" height="112"><rect width="112" height="112" fill="#8a9a5b"/><circle cx="56" cy="42" r="20" fill="#e8e6df"/><ellipse cx="56" cy="96" rx="34" ry="26" fill="#e8e6df"/></svg>`,
          ),
      }}
    />
    <Avatar user={{ handle: "baydar-team" }} size="lg" />
  </div>
);
