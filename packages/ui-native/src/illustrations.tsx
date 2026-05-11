// Empty-state illustrations — native twins of packages/ui-web/src/illustrations.tsx.
// Direction lives in design-out/empty-states/style-direction.md.

import type { JSX } from "react";
import Svg, { Circle, Path, Rect, type SvgProps } from "react-native-svg";

import { nativeTokens } from "./tokens";

type Props = SvgProps & { size?: number; color?: string };

const TINT = nativeTokens.color.brand50;
const DEFAULT_STROKE = nativeTokens.color.brand700;

function Base({
  size,
  color,
  children,
  ...rest
}: Props & { children: React.ReactNode }): JSX.Element {
  const stroke = color ?? DEFAULT_STROKE;
  return (
    <Svg
      viewBox="0 0 128 128"
      width={size ?? 128}
      height={size ?? 128}
      fill="none"
      stroke={stroke}
      strokeWidth={nativeTokens.illustration.stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      accessibilityElementsHidden
      importantForAccessibility="no"
      {...rest}
    >
      {children}
    </Svg>
  );
}

export function WheatSheaf(p: Props): JSX.Element {
  return (
    <Base {...p}>
      <Path d="M28 104 H100" />
      <Rect x="52" y="88" width="24" height="10" rx="2" fill={TINT} />
      <Path d="M64 88 L48 30" />
      <Path d="M64 88 L80 30" />
      <Path d="M64 88 L64 28" />
      <Path d="M44 38 L52 34 M46 46 L54 42 M48 54 L56 50 M50 62 L58 58 M52 70 L60 66" />
      <Path d="M84 38 L76 34 M82 46 L74 42 M80 54 L72 50 M78 62 L70 58 M76 70 L68 66" />
      <Path d="M60 36 L68 36 M60 46 L68 46 M60 56 L68 56" />
    </Base>
  );
}

export function DoorArch(p: Props): JSX.Element {
  return (
    <Base {...p}>
      <Path d="M16 108 H112" />
      <Path d="M16 108 V72 H32" />
      <Path d="M112 108 V72 H96" />
      <Path d="M32 108 V60 Q32 36 64 36 Q96 36 96 60 V108" fill={TINT} />
      <Path d="M32 100 H96" />
      <Path d="M64 100 V44" />
    </Base>
  );
}

export function EnvelopeFolded(p: Props): JSX.Element {
  return (
    <Base {...p}>
      <Rect x="20" y="36" width="88" height="60" rx="4" fill={TINT} />
      <Path d="M20 40 L64 70 L108 40" />
      <Path d="M20 92 L52 70" />
      <Path d="M108 92 L76 70" />
    </Base>
  );
}

export function Lantern(p: Props): JSX.Element {
  return (
    <Base {...p}>
      <Path d="M64 14 V28" />
      <Path d="M48 28 H80" />
      <Path d="M52 32 L76 32 L84 56 L76 88 L52 88 L44 56 Z" fill={TINT} />
      <Path d="M64 50 V72" />
      <Path d="M48 92 H80" />
      <Path d="M28 60 H36 M92 60 H100 M32 44 L38 48 M96 44 L90 48 M32 76 L38 72 M96 76 L90 72" />
    </Base>
  );
}

export function WinnowingTray(p: Props): JSX.Element {
  return (
    <Base {...p}>
      <Circle cx="64" cy="64" r="44" fill={TINT} />
      <Circle cx="64" cy="64" r="32" />
      <Path d="M32 64 H96 M64 32 V96" />
      <Path d="M40 40 L88 88 M88 40 L40 88" />
    </Base>
  );
}

export function BriefcaseTied(p: Props): JSX.Element {
  return (
    <Base {...p}>
      <Path d="M50 40 Q50 28 64 28 Q78 28 78 40" />
      <Rect x="20" y="40" width="88" height="60" rx="6" fill={TINT} />
      <Path d="M64 40 V100" />
      <Rect x="58" y="64" width="12" height="10" rx="2" />
      <Path d="M16 108 H112" />
    </Base>
  );
}

export function FieldRows(p: Props): JSX.Element {
  return (
    <Base {...p}>
      <Path d="M14 50 H114" />
      <Path d="M20 70 H108" />
      <Path d="M16 86 H112" />
      <Path d="M12 102 H116" />
      <Path d="M30 70 V62 M50 70 V62 M70 70 V62 M90 70 V62" />
      <Path d="M26 86 V76 M48 86 V76 M72 86 V76 M96 86 V76" />
      <Path d="M22 102 V90 M46 102 V90 M74 102 V90 M100 102 V90" />
      <Rect x="14" y="34" width="100" height="16" rx="2" fill={TINT} stroke="none" />
    </Base>
  );
}

export function LowWall(p: Props): JSX.Element {
  return (
    <Base {...p}>
      <Path d="M14 100 H114" />
      <Rect x="20" y="64" width="38" height="36" rx="2" fill={TINT} />
      <Rect x="70" y="64" width="38" height="36" rx="2" fill={TINT} />
      <Path d="M58 100 V70 M70 100 V70" />
      <Path d="M20 76 H58 M20 88 H58" />
      <Path d="M34 64 V76 M44 76 V88 M30 88 V100" />
      <Path d="M70 76 H108 M70 88 H108" />
      <Path d="M84 64 V76 M94 76 V88 M80 88 V100" />
    </Base>
  );
}
