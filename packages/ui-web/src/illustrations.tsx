// Empty-state illustrations — geometric, agrarian, two-tone.
// Direction lives in design-out/empty-states/style-direction.md.
//
// Rules:
//   - viewBox 128x128, strokeWidth=2, strokeLinecap/Join=round.
//   - Stroke uses currentColor (parent sets text-brand-700 via EmptyState).
//   - Fill on tinted regions uses var(--brand-50) — no raw hex in tsx.
//   - No human figures, no shadows, no gradients.

import type { JSX, SVGProps } from "react";

type Props = SVGProps<SVGSVGElement> & { size?: number };

const TINT = "var(--brand-50)";

function Base({ size, children, ...rest }: Props & { children: React.ReactNode }): JSX.Element {
  return (
    <svg
      viewBox="0 0 128 128"
      width={size ?? 128}
      height={size ?? 128}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

export function WheatSheaf(p: Props): JSX.Element {
  return (
    <Base {...p}>
      {/* Ground line */}
      <path d="M28 104 H100" />
      {/* Bound base */}
      <path d="M52 94 H76" fill={TINT} />
      <rect x="52" y="88" width="24" height="10" rx="2" fill={TINT} />
      {/* Two stalks crossing */}
      <path d="M64 88 L48 30" />
      <path d="M64 88 L80 30" />
      <path d="M64 88 L64 28" />
      {/* Grain heads — slanted ticks */}
      <path d="M44 38 L52 34 M46 46 L54 42 M48 54 L56 50 M50 62 L58 58 M52 70 L60 66" />
      <path d="M84 38 L76 34 M82 46 L74 42 M80 54 L72 50 M78 62 L70 58 M76 70 L68 66" />
      <path d="M60 36 L68 36 M60 46 L68 46 M60 56 L68 56" />
    </Base>
  );
}

export function DoorArch(p: Props): JSX.Element {
  return (
    <Base {...p}>
      {/* Ground */}
      <path d="M16 108 H112" />
      {/* Wall segments */}
      <path d="M16 108 V72 H32" />
      <path d="M112 108 V72 H96" />
      {/* Arch body (tinted opening) */}
      <path d="M32 108 V60 Q32 36 64 36 Q96 36 96 60 V108" fill={TINT} />
      {/* Threshold */}
      <path d="M32 100 H96" />
      {/* Center mullion hint */}
      <path d="M64 100 V44" />
    </Base>
  );
}

export function EnvelopeFolded(p: Props): JSX.Element {
  return (
    <Base {...p}>
      {/* Envelope body */}
      <rect x="20" y="36" width="88" height="60" rx="4" fill={TINT} />
      {/* Open flap as V */}
      <path d="M20 40 L64 70 L108 40" fill="none" />
      {/* Bottom fold hints */}
      <path d="M20 92 L52 70" />
      <path d="M108 92 L76 70" />
    </Base>
  );
}

export function Lantern(p: Props): JSX.Element {
  return (
    <Base {...p}>
      {/* Hanging cord */}
      <path d="M64 14 V28" />
      {/* Top cap */}
      <path d="M48 28 H80" />
      {/* Body — tinted hex */}
      <path d="M52 32 L76 32 L84 56 L76 88 L52 88 L44 56 Z" fill={TINT} />
      {/* Inner flame line */}
      <path d="M64 50 V72" />
      {/* Base */}
      <path d="M48 92 H80" />
      {/* Soft rays */}
      <path d="M28 60 H36 M92 60 H100 M32 44 L38 48 M96 44 L90 48 M32 76 L38 72 M96 76 L90 72" />
    </Base>
  );
}

export function WinnowingTray(p: Props): JSX.Element {
  return (
    <Base {...p}>
      {/* Outer ring */}
      <circle cx="64" cy="64" r="44" fill={TINT} />
      {/* Inner ring */}
      <circle cx="64" cy="64" r="32" fill="none" />
      {/* Weave cross */}
      <path d="M32 64 H96 M64 32 V96" />
      {/* Diagonals — subtle hint of woven texture */}
      <path d="M40 40 L88 88 M88 40 L40 88" />
    </Base>
  );
}

export function BriefcaseTied(p: Props): JSX.Element {
  return (
    <Base {...p}>
      {/* Handle arch */}
      <path d="M50 40 Q50 28 64 28 Q78 28 78 40" />
      {/* Body */}
      <rect x="20" y="40" width="88" height="60" rx="6" fill={TINT} />
      {/* Tie cord — single vertical */}
      <path d="M64 40 V100" />
      {/* Knot — small rect at center */}
      <rect x="58" y="64" width="12" height="10" rx="2" fill="none" />
      {/* Ground line */}
      <path d="M16 108 H112" />
    </Base>
  );
}

export function FieldRows(p: Props): JSX.Element {
  return (
    <Base {...p}>
      {/* Horizon */}
      <path d="M14 50 H114" />
      {/* Three plowed rows receding */}
      <path d="M20 70 H108" />
      <path d="M16 86 H112" />
      <path d="M12 102 H116" />
      {/* Furrow ticks */}
      <path d="M30 70 V62 M50 70 V62 M70 70 V62 M90 70 V62" />
      <path d="M26 86 V76 M48 86 V76 M72 86 V76 M96 86 V76" />
      <path d="M22 102 V90 M46 102 V90 M74 102 V90 M100 102 V90" />
      {/* Distant tinted sky band */}
      <rect x="14" y="34" width="100" height="16" rx="2" fill={TINT} stroke="none" />
    </Base>
  );
}

export function LowWall(p: Props): JSX.Element {
  return (
    <Base {...p}>
      {/* Ground */}
      <path d="M14 100 H114" />
      {/* Left wall */}
      <rect x="20" y="64" width="38" height="36" rx="2" fill={TINT} />
      {/* Right wall */}
      <rect x="70" y="64" width="38" height="36" rx="2" fill={TINT} />
      {/* Gap markers */}
      <path d="M58 100 V70 M70 100 V70" />
      {/* Brick lines — left */}
      <path d="M20 76 H58 M20 88 H58" />
      <path d="M34 64 V76 M44 76 V88 M30 88 V100" />
      {/* Brick lines — right */}
      <path d="M70 76 H108 M70 88 H108" />
      <path d="M84 64 V76 M94 76 V88 M80 88 V100" />
    </Base>
  );
}
