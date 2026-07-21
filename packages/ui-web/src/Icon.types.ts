// IconName/IconProps for the web Icon — split out to mirror
// packages/ui-native/src/Icon.types.ts. Both unions stay in lockstep
// (web additionally has "building" and "employer").

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
  | "x"
  | "employer";

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, "name" | "ref"> {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  title?: string;
}
