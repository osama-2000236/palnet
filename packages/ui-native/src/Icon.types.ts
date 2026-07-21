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
  | "user"
  | "users"
  | "video"
  | "x";

export interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}
