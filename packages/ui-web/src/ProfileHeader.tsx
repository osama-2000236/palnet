// ProfileHeader — the top-of-profile band: cover gradient + overlapping avatar
// + identity block + a single CTA slot. See DESIGN.md §13 (cover gradient is the
// ONLY allowed decorative gradient) and §8 (web/native parity).
//
// Framework-neutral: no next/* or app APIs. The consuming app passes its own
// CTAs (Connect / Edit / message / report …) through `actions`.

import type { ReactNode } from "react";

import { Avatar, type AvatarUser } from "./Avatar";
import { cx } from "./cx";
import { Surface } from "./Surface";

export interface ProfileHeaderProps {
  user: AvatarUser;
  fullName: string;
  headline?: string | null;
  /** Secondary meta line — e.g. "Ramallah · 320 connections" or "/in/handle". */
  meta?: ReactNode;
  /** App-owned CTA cluster. Exactly one accent CTA per DESIGN.md. */
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
    <Surface as="header" variant="hero" padding="0" className={cx(className)}>
      {/* cover band — the single decorative gradient, full-bleed, responsive height */}
      <div
        aria-hidden="true"
        className="h-[104px] md:h-[160px]"
        style={{ background: "var(--cover-gradient)" }}
      />

      {/* body — avatar overlaps the band by half */}
      <div className="flex flex-wrap items-end justify-between gap-4 px-4 pb-4">
        <div className="flex min-w-0 flex-col">
          {/* xl Avatar is 96px and carries its own 3px surface border */}
          <Avatar user={user} size="xl" className="-mt-12" />
          <h1 dir="auto" className="text-h1 text-ink mt-2">
            {fullName}
          </h1>
          {headline ? (
            <p dir="auto" className="text-small text-ink-muted font-body">
              {headline}
            </p>
          ) : null}
          {meta ? <p className="text-caption text-ink-muted">{meta}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2 pb-1">{actions}</div> : null}
      </div>
    </Surface>
  );
}
