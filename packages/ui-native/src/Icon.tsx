// Icon — native twin of ui-web/Icon.
//
// Rules (mirror the web rules so the two stay in lockstep):
//   • Same IconName union as web — adding a glyph means updating both files
//     in the same PR.
//   • Color is driven by `color` prop. No hex literals at call sites; pass
//     a nativeTokens.color.* value.
//   • `accessibilityElementsHidden` by default — icons are decorative. Pair
//     with `accessibilityLabel` on the interactive parent.
//   • Same 24×24 viewBox, same stroke-width default as web so glyph weight
//     matches across platforms.

import Svg, { Circle, Ellipse, Path, Rect } from "react-native-svg";

import { nativeTokens } from "./tokens";

export type IconName =
  | "bell"
  | "bookmark"
  | "briefcase"
  | "calendar"
  | "check"
  | "check-double"
  | "chevron-down"
  | "clock"
  | "comment"
  | "home"
  | "image"
  | "logo"
  | "message"
  | "more"
  | "plus"
  | "repost"
  | "search"
  | "send"
  | "send-paper"
  | "thumb"
  | "users"
  | "video"
  | "x";

export interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function Icon({
  name,
  size = 20,
  color = nativeTokens.color.ink,
  strokeWidth = 1.8,
}: IconProps): JSX.Element | null {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none" as const,
    stroke: color,
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (name) {
    case "home":
      return (
        <Svg {...common}>
          <Path d="M3 11 12 4l9 7" />
          <Path d="M5 10v10h14V10" />
        </Svg>
      );
    case "users":
      return (
        <Svg {...common}>
          <Circle cx={9} cy={9} r={3.5} />
          <Path d="M2.5 20c0-3 3-5 6.5-5s6.5 2 6.5 5" />
          <Circle cx={17} cy={10} r={2.5} />
          <Path d="M21.5 19c0-2-1.5-3.5-4-4" />
        </Svg>
      );
    case "briefcase":
      return (
        <Svg {...common}>
          <Rect x={3} y={7} width={18} height={13} rx={2} />
          <Path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <Path d="M3 13h18" />
        </Svg>
      );
    case "message":
      return (
        <Svg {...common}>
          <Path d="M4 5h16v12H8l-4 4z" />
        </Svg>
      );
    case "bell":
      return (
        <Svg {...common}>
          <Path d="M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6z" />
          <Path d="M10 19a2 2 0 0 0 4 0" />
        </Svg>
      );
    case "search":
      return (
        <Svg {...common}>
          <Circle cx={11} cy={11} r={7} />
          <Path d="m20 20-3.5-3.5" />
        </Svg>
      );
    case "plus":
      return (
        <Svg {...common}>
          <Path d="M12 5v14M5 12h14" />
        </Svg>
      );
    case "image":
      return (
        <Svg {...common}>
          <Rect x={3} y={4} width={18} height={16} rx={2} />
          <Circle cx={9} cy={10} r={2} />
          <Path d="m3 18 6-5 5 4 3-2 4 3" />
        </Svg>
      );
    case "video":
      return (
        <Svg {...common}>
          <Rect x={3} y={6} width={13} height={12} rx={2} />
          <Path d="m16 10 5-3v10l-5-3z" />
        </Svg>
      );
    case "thumb":
      return (
        <Svg {...common}>
          <Path d="M7 11v9H4v-9zM7 11l4-7c1.5 0 2.5 1 2.5 2.5V10h5a2 2 0 0 1 2 2.3l-1.2 6A2 2 0 0 1 17.3 20H7" />
        </Svg>
      );
    case "comment":
      return (
        <Svg {...common}>
          <Path d="M4 5h16v12H8l-4 4z" />
        </Svg>
      );
    case "calendar":
      return (
        <Svg {...common}>
          <Rect x={3} y={5} width={18} height={16} rx={2} />
          <Path d="M3 10h18M8 3v4M16 3v4" />
        </Svg>
      );
    case "repost":
      return (
        <Svg {...common}>
          <Path d="M4 8h12l-3-3M20 16H8l3 3" />
        </Svg>
      );
    case "send":
      return (
        <Svg {...common}>
          <Path d="m21 3-9 18-2-8-8-2z" />
        </Svg>
      );
    case "send-paper":
      return (
        <Svg {...common}>
          <Path d="M21 12 3 4l3 8-3 8z" />
          <Path d="M6 12h15" />
        </Svg>
      );
    case "check":
      return (
        <Svg {...common}>
          <Path d="m5 12 5 5L20 7" />
        </Svg>
      );
    case "check-double":
      return (
        <Svg {...common}>
          <Path d="m3 12 4 4L15 7" />
          <Path d="m10 16 1 1L22 7" />
        </Svg>
      );
    case "clock":
      return (
        <Svg {...common}>
          <Circle cx={12} cy={12} r={8.5} />
          <Path d="M12 7v5l3 2" />
        </Svg>
      );
    case "x":
      return (
        <Svg {...common}>
          <Path d="M6 6l12 12M18 6 6 18" />
        </Svg>
      );
    case "more":
      return (
        <Svg {...common}>
          <Circle cx={5} cy={12} r={1.4} fill={color} stroke="none" />
          <Circle cx={12} cy={12} r={1.4} fill={color} stroke="none" />
          <Circle cx={19} cy={12} r={1.4} fill={color} stroke="none" />
        </Svg>
      );
    case "chevron-down":
      return (
        <Svg {...common}>
          <Path d="m6 9 6 6 6-6" />
        </Svg>
      );
    case "bookmark":
      return (
        <Svg {...common}>
          <Path d="M6 4h12v17l-6-4-6 4z" />
        </Svg>
      );
    case "logo":
      // Baydar mark — wheat head on olive circle.
      // RN can't use Tailwind classes on SVG primitives — read hex from nativeTokens.
      return (
        <Svg width={size} height={size} viewBox="0 0 64 64">
          <Circle cx={32} cy={32} r={30} fill={nativeTokens.color.brand600} />
          <Rect x={31} y={14} width={2} height={37} rx={1} fill={nativeTokens.color.brand50} />
          <Ellipse cx={27} cy={19} rx={2.6} ry={4.6} origin="27,19" rotation={-28} fill={nativeTokens.color.brand50} />
          <Ellipse cx={37} cy={19} rx={2.6} ry={4.6} origin="37,19" rotation={28}  fill={nativeTokens.color.brand50} />
          <Ellipse cx={26} cy={27} rx={2.8} ry={4.8} origin="26,27" rotation={-28} fill={nativeTokens.color.brand50} />
          <Ellipse cx={38} cy={27} rx={2.8} ry={4.8} origin="38,27" rotation={28}  fill={nativeTokens.color.brand50} />
          <Ellipse cx={25} cy={35} rx={2.8} ry={4.8} origin="25,35" rotation={-28} fill={nativeTokens.color.brand50} />
          <Ellipse cx={39} cy={35} rx={2.8} ry={4.8} origin="39,35" rotation={28}  fill={nativeTokens.color.brand50} />
          <Ellipse cx={24} cy={43} rx={2.8} ry={4.8} origin="24,43" rotation={-28} fill={nativeTokens.color.brand50} />
          <Ellipse cx={40} cy={43} rx={2.8} ry={4.8} origin="40,43" rotation={28}  fill={nativeTokens.color.brand50} />
        </Svg>
      );
    default:
      return null;
  }
}
