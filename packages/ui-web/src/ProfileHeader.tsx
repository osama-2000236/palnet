// ProfileHeader — cover band + identity block for profile screens.
// Lifted from "Baydar Motion & Cover Gradient" handoff (DESIGN.md §8, §13).
//
// The cover gradient is the single allowed decorative gradient in the system
// (--cover-gradient). The xl avatar overlaps the band by half with a 3px
// surface-colored border so it reads against the olive. Exactly one accent
// CTA belongs in `actions` — Connect (public) / Edit (self).
//
// Framework-neutral: no next/* or expo imports. App wrappers own routing.

import type { ReactNode } from "react";

import { Avatar, type AvatarUser } from "./Avatar";
import { cx } from "./cx";

export interface ProfileHeaderProps {
  user: AvatarUser;
  /** Full display name — rendered as the page h1. */
  fullName: string;
  /** Professional headline — small, body font. */
  headline?: string | null;
  /** Secondary meta line (location, handle, connection count). */
  meta?: ReactNode;
  /** Action area — keep to a single accent CTA per DESIGN.md. */
  actions?: ReactNode;
  className?: string;
}

export function ProfileHeader({
  user,
  fullName,
  headline,
  meta,
  actions,
  className,
}: ProfileHeaderProps): JSX.Element {
  return (
    <header
      className={cx(
        "border-line-soft bg-surface shadow-card overflow-hidden rounded-xl border",
        className,
      )}
    >
      {/* Cover band — responsive height, the only decorative gradient. */}
      <div
        aria-hidden="true"
        className="h-[104px] md:h-[160px]"
        style={{ background: "var(--cover-gradient)" }}
      />

      <div className="flex flex-wrap items-end justify-between gap-4 px-4 pb-4">
        <div className="flex min-w-0 flex-col">
          {/* Avatar overlaps the band by half. xl size carries the 3px border. */}
          <Avatar user={user} size="xl" className="-mt-12" />
          <h1 className="text-ink text-h1 mt-2 font-semibold">{fullName}</h1>
          {headline ? <p className="text-ink-muted text-small font-body">{headline}</p> : null}
          {meta ? <p className="text-ink-subtle text-caption">{meta}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2 pb-1">{actions}</div> : null}
      </div>
    </header>
  );
}
