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

import { Circle, Ellipse, Path, Rect, Svg } from "react-native-svg";

import type { IconProps } from "./Icon.types";
import { useThemeTokens } from "./ThemeProvider";

export type { IconName, IconProps } from "./Icon.types";

// Wheat grains of the logo mark: [cx, cy, rx, ry, rotation]. Mirrored pairs,
// bottom-heavy. Data, not markup — eight hand-written <Ellipse> blocks is how
// this file crept up on the 300-LOC qa:design ceiling.
const WHEAT_GRAINS: ReadonlyArray<[number, number, number, number, number]> = [
  [27, 19, 2.6, 4.6, -28],
  [37, 19, 2.6, 4.6, 28],
  [26, 27, 2.8, 4.8, -28],
  [38, 27, 2.8, 4.8, 28],
  [25, 35, 2.8, 4.8, -28],
  [39, 35, 2.8, 4.8, 28],
  [24, 43, 2.8, 4.8, -28],
  [40, 43, 2.8, 4.8, 28],
];

// Cog outline for the `gear` glyph. Shared verbatim with the web twin so the
// two icons stay identical. Data, not markup.
const GEAR_TEETH =
  "M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z";

export function Icon({ name, size = 20, color, strokeWidth = 1.8 }: IconProps): JSX.Element | null {
  const tk = useThemeTokens();
  const iconColor = color ?? tk.color.ink;
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none" as const,
    stroke: iconColor,
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    accessibilityElementsHidden: true,
    importantForAccessibility: "no-hide-descendants" as const,
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
    case "user":
      return (
        <Svg {...common}>
          <Circle cx={12} cy={8} r={4} />
          <Path d="M4 21c0-4 3.5-7 8-7s8 3 8 7" />
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
    case "building":
      // Employer / company glyph — used by the employer nav tab on both shells.
      return (
        <Svg {...common}>
          <Rect x={4} y={8} width={16} height={12} rx={2} />
          <Rect x={8} y={12} width={4} height={4} />
          <Rect x={12} y={12} width={4} height={4} />
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
    case "trash":
      return (
        <Svg {...common}>
          <Path d="M4 7h16M10 4h4M6 7l1 13h10l1-13M10 11v6M14 11v6" />
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
    case "share":
      return (
        <Svg {...common}>
          <Circle cx={18} cy={5} r={3} />
          <Circle cx={6} cy={12} r={3} />
          <Circle cx={18} cy={19} r={3} />
          <Path d="m8.6 13.5 6.8 3.9" />
          <Path d="M15.4 6.6 8.6 10.5" />
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
    case "gear":
      // A toothed cog, not a circle with straight spokes — spokes read as a
      // sun/brightness glyph, which is what settings rows were showing.
      return (
        <Svg {...common}>
          <Circle cx={12} cy={12} r={3.2} />
          <Path d={GEAR_TEETH} />
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
          <Circle cx={5} cy={12} r={1.4} fill={iconColor} stroke="none" />
          <Circle cx={12} cy={12} r={1.4} fill={iconColor} stroke="none" />
          <Circle cx={19} cy={12} r={1.4} fill={iconColor} stroke="none" />
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
        <Svg
          width={size}
          height={size}
          viewBox="0 0 64 64"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Circle cx={32} cy={32} r={30} fill={tk.color.brand600} />
          <Rect x={31} y={14} width={2} height={37} rx={1} fill={tk.color.brand50} />
          {WHEAT_GRAINS.map(([cx, cy, rx, ry, rot]) => (
            <Ellipse
              key={`${cx}-${cy}`}
              cx={cx}
              cy={cy}
              rx={rx}
              ry={ry}
              transform={`rotate(${rot} ${cx} ${cy})`}
              fill={tk.color.brand50}
            />
          ))}
        </Svg>
      );
    default:
      return null;
  }
}
