// Avatar — the default representation of a person on Baydar.
// Lifted from docs/_archive/prototype-2025/components/primitives.jsx (Avatar).
//
// Rules:
//   • Shows `avatarUrl` if provided; otherwise initials on a token-backed
//     palette derived deterministically from the user's id/handle.
//   • `ring` adds the olive brand ring used on own-profile headers.
//   • `online` adds the presence dot used in messaging rooms.
//   • All colors/tokens flow through Tailwind classes — no inline hex.

import { cx } from "./cx";

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

export interface AvatarUser {
  id?: string | null;
  handle?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
  avatarBlurhash?: string | null;
}

export interface AvatarProps {
  user: AvatarUser | null | undefined;
  size?: AvatarSize;
  ring?: boolean;
  online?: boolean;
  className?: string;
  /** Accessible label override. Defaults to the person's name. */
  alt?: string;
}
// `blurhash` used to be declared here and read by nothing — a prop that does
// nothing, which is the same defect class this repo already deleted from
// PostCard (a fifth action wired to no handler) and Sheet (a grabber that did
// not drag). The native twin genuinely uses it, because expo-image decodes a
// blurhash for free; the web has no decoder without a new dependency, and a
// 24–96px circle does not warrant one — the tokenized initials chip is already
// painted underneath, so the image fades in over a filled shape rather than
// over nothing. `AvatarUser.avatarBlurhash` stays: it is data the API returns
// and one platform consumes, so both platforms keep accepting the same user
// object. Recorded in PARITY.md.

const BOX_CLASSES: Record<AvatarSize, string> = {
  xs: "h-6 w-6 text-micro",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
  xl: "h-24 w-24 text-3xl border-[3px] border-surface",
};

const DOT_CLASSES: Record<AvatarSize, string> = {
  xs: "h-[7px] w-[7px]",
  sm: "h-[9px] w-[9px]",
  md: "h-[11px] w-[11px]",
  lg: "h-[13px] w-[13px]",
  xl: "h-[15px] w-[15px]",
};

// Five CSS-token-backed palettes. Chosen deterministically from user id/handle so
// the same person always gets the same color across the app.
const PALETTES = [
  "bg-[var(--avatar-palette-1-bg)] text-[var(--avatar-palette-1-fg)]",
  "bg-[var(--avatar-palette-2-bg)] text-[var(--avatar-palette-2-fg)]",
  "bg-[var(--avatar-palette-3-bg)] text-[var(--avatar-palette-3-fg)]",
  "bg-[var(--avatar-palette-4-bg)] text-[var(--avatar-palette-4-fg)]",
  "bg-[var(--avatar-palette-5-bg)] text-[var(--avatar-palette-5-fg)]",
] as const;

function paletteFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  const idx = Math.abs(hash) % PALETTES.length;
  return PALETTES[idx] ?? PALETTES[0]!;
}

// Skip the Arabic definite article so "الخطيب" yields "خ" — otherwise
// names like "ليان الخطيب" spell "لا" ("no") as their initials.
function initialLetter(word: string): string {
  const bare = word.startsWith("ال") && word.length > 2 ? word.slice(2) : word;
  return bare[0] ?? "";
}

function initialsOf(user: AvatarUser): string {
  const first = (user.firstName ?? "").trim();
  const last = (user.lastName ?? "").trim();
  if (first || last) {
    return `${initialLetter(first)}${initialLetter(last)}`.toUpperCase() || "?";
  }
  const handle = (user.handle ?? "").trim();
  if (handle) return handle.slice(0, 2).toUpperCase();
  return "?";
}

function nameOf(user: AvatarUser): string {
  const joined = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
  return joined || user.handle || "";
}

export function Avatar({
  user,
  size = "md",
  ring = false,
  online = false,
  className,
  alt,
}: AvatarProps): JSX.Element | null {
  if (!user) return null;

  const seed = user.id || user.handle || nameOf(user) || "0";
  const palette = paletteFor(seed);
  const initials = initialsOf(user);
  const label = alt ?? nameOf(user);

  const box = cx(
    "relative inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full font-semibold",
    BOX_CLASSES[size],
    // The palette chip is painted whether or not there is a photo. It used to
    // be swapped for a flat `surface-sunken` the moment an `avatarUrl` existed,
    // which meant a slow image showed a grey hole and a broken one (a deleted
    // upload, an expired signed URL) showed a grey hole permanently. Now the
    // initials sit underneath and the photo covers them.
    palette,
    ring && "ring-2 ring-brand-600 ring-offset-2 ring-offset-surface",
    className,
  );

  const a11yProps = label ? { "aria-label": label, role: "img" } : { "aria-hidden": true };

  return (
    <span className={box} {...a11yProps}>
      <span aria-hidden="true">{initials}</span>
      {user.avatarUrl ? (
        <img
          src={user.avatarUrl}
          // Empty on purpose: the wrapper is `role="img"` with the person's
          // name as its `aria-label`, so a non-empty alt here is the same name
          // announced twice.
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : null}
      {online ? (
        <span
          aria-hidden="true"
          className={cx(
            "border-surface bg-success absolute bottom-0 end-0 rounded-full border-2",
            DOT_CLASSES[size],
          )}
        />
      ) : null}
    </span>
  );
}
