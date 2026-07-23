import type { AppShellRoute } from "./AppShell.types";
import type { IconName } from "./Icon";

export const NAV_ITEMS: ReadonlyArray<{
  key: Exclude<AppShellRoute, "profile">;
  icon: IconName;
}> = [
  { key: "feed", icon: "home" },
  { key: "network", icon: "users" },
  { key: "jobs", icon: "briefcase" },
  { key: "messages", icon: "message" },
  { key: "notifications", icon: "bell" },
  { key: "activity", icon: "clock" },
  { key: "saved", icon: "bookmark" },
  { key: "employer", icon: "building" },
];

/**
 * Badge text for an unread count. `formatCount` comes from the app (which owns
 * the locale and the digit-script policy in @baydar/shared); without it the
 * kit falls back to Latin digits.
 */
export function formatBadge(count: number, formatCount: (value: number) => string): string {
  if (count <= 0) return "";
  if (count > 99) return `${formatCount(99)}+`;
  return formatCount(count);
}
