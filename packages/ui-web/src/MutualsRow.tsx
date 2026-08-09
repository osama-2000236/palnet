// MutualsRow — «٤ معارف مشتركين», with three faces behind it.
//
// The number carries the information; the faces are there so the number is
// checkable. Three, because that is what fits, and because a fourth avatar
// tells nobody anything the count did not.
//
// Renders nothing at zero. "0 mutual connections" is a sentence that makes a
// stranger feel further away, which is the opposite of what this is for.

import type { JSX } from "react";

import { Avatar, type AvatarUser } from "./Avatar";
import { cx } from "./cx";

export interface MutualsRowProps {
  count: number;
  /** At most three. More are ignored rather than rendered small. */
  sample: AvatarUser[];
  /** Pre-formatted by the host, in the reader's digits. */
  label: string;
  className?: string;
}

export function MutualsRow({
  count,
  sample,
  label,
  className,
}: MutualsRowProps): JSX.Element | null {
  if (count === 0) return null;

  return (
    <div className={cx("flex items-center gap-2", className)}>
      {sample.length > 0 ? (
        // Overlapped, and marked decorative: the names are already in the
        // label, and reading three of them again is noise on a screen reader.
        <div aria-hidden="true" className="flex -space-x-2 [direction:ltr] rtl:space-x-reverse">
          {sample.slice(0, 3).map((person) => (
            <Avatar key={person.id} user={person} size="xs" />
          ))}
        </div>
      ) : null}
      <span className="text-small text-ink-muted">{label}</span>
    </div>
  );
}
