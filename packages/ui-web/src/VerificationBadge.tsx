// VerificationBadge — what was checked, never "verified".
//
// LinkedIn has one blue tick that means several unrelated things. Baydar has
// four checks that each mean exactly one thing, and this component refuses to
// blur them: every badge names its method. «رقم مؤكَّد» is not «موثّق», and
// `check-naming` bans the word معتمد entirely for the same reason.
//
// No icon, deliberately. Four glyphs would be four things a reader has to learn
// before the badge means anything, and the label already says which check it
// was. The host supplies that label — ui-web spells no Arabic and no English.

import type { JSX } from "react";

import { Badge, type BadgeSize, type BadgeTone } from "./Badge";

export type VerificationMethodName = "PHONE" | "WORK_EMAIL" | "EDU_EMAIL" | "PROFESSIONAL_BODY";

export interface VerificationBadgeProps {
  method: VerificationMethodName;
  /** The short label, already localised: «رقم مؤكَّد», «بريد جامعي», … */
  label: string;
  /** The full sentence a screen reader gets, e.g. «رقم الهاتف مؤكَّد». */
  srLabel?: string;
  size?: BadgeSize;
  className?: string;
}

/**
 * A body check is the only one an employer would actually rely on, so it is the
 * only one that gets the brand tone and a dot. The rest are neutral — visible,
 * not celebrated. A profile covered in loud badges is a profile whose badges
 * mean nothing.
 */
const METHOD_TONE: Record<VerificationMethodName, BadgeTone> = {
  PHONE: "neutral",
  WORK_EMAIL: "neutral",
  EDU_EMAIL: "neutral",
  PROFESSIONAL_BODY: "brand",
};

export function VerificationBadge({
  method,
  label,
  srLabel,
  size = "md",
  className,
}: VerificationBadgeProps): JSX.Element {
  return (
    <Badge
      tone={METHOD_TONE[method]}
      size={size}
      dot={method === "PROFESSIONAL_BODY"}
      srLabel={srLabel ?? label}
      className={className}
    >
      {label}
    </Badge>
  );
}
