// IconName/IconProps for the web Icon — split out to mirror
// packages/ui-native/src/Icon.types.ts. Both unions stay in lockstep
// (native additionally has "user").

import type { SVGProps } from "react";

export type IconName =
  | "bell"
  | "bookmark"
  | "briefcase"
  | "building"
  | "calendar"
  | "check"
  | "check-double"
  | "chevron-down"
  | "clock"
  | "comment"
  | "gear"
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
  | "share"
  | "thumb"
  | "users"
  | "video"
  | "x";

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, "name" | "ref"> {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  title?: string;
}
