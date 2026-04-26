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

const BOX_CLASSES: Record<AvatarSize, string> = {
  xs: "h-6 w-6 text-micro",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
  xl: "h-24 w-24 text-3xl border-3 border-surface",
};

const DOT_CLASSES: Record<AvatarSize, string> = {
  xs: "h-avatar-dot-xs w-avatar-dot-xs",
  sm: "h-avatar-dot-sm w-avatar-dot-sm",
  md: "h-avatar-dot-md w-avatar-dot-md",
  lg: "h-avatar-dot-lg w-avatar-dot-lg",
  xl: "h-avatar-dot-xl w-avatar-dot-xl",
};

// Three token-backed palettes. Chosen deterministically from user id/handle so
// the same person always gets the same color across the app.
const PALETTES = [
  "bg-brand-100 text-brand-700",
  "bg-accent-50 text-accent-600",
  "bg-surface-sunken text-ink",
] as const;

function paletteFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  const idx = Math.abs(hash) % PALETTES.length;
  return PALETTES[idx] ?? PALETTES[0]!;
}

function initialsOf(user: AvatarUser): string {
  const first = (user.firstName ?? "").trim();
  const last = (user.lastName ?? "").trim();
  if (first || last) {
    return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase() || "?";
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
    user.avatarUrl ? "bg-surface-sunken" : palette,
    ring && "ring-2 ring-brand-600 ring-offset-2 ring-offset-surface",
    className,
  );

  return (
    <span
      className={box}
      aria-hidden={label ? undefined : true}
      aria-label={label || undefined}
      role={label ? "img" : undefined}
    >
      {user.avatarUrl ? (
        <img src={user.avatarUrl} alt={label} className="h-full w-full object-cover" />
      ) : (
        <span aria-hidden="true">{initials}</span>
      )}
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
