// VerificationBadge — native twin of packages/ui-web/src/VerificationBadge.tsx.
//
// Same prop vocabulary: method / label / srLabel / size. Native has no
// `className`. Same rule on both platforms: the badge names its method, and
// only the professional-body check is toned up.

import { Badge, type BadgeSize, type BadgeTone } from "./Badge";

export type VerificationMethodName = "PHONE" | "WORK_EMAIL" | "EDU_EMAIL" | "PROFESSIONAL_BODY";

export interface VerificationBadgeProps {
  method: VerificationMethodName;
  /** The short label, already localised: «رقم مؤكَّد», «بريد جامعي», … */
  label: string;
  /** The full sentence a screen reader gets, e.g. «رقم الهاتف مؤكَّد». */
  srLabel?: string;
  size?: BadgeSize;
}

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
}: VerificationBadgeProps): JSX.Element {
  return (
    <Badge
      tone={METHOD_TONE[method]}
      size={size}
      dot={method === "PROFESSIONAL_BODY"}
      srLabel={srLabel ?? label}
    >
      {label}
    </Badge>
  );
}
