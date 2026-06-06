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

export function formatBadge(count: number): string {
  if (count <= 0) return "";
  if (count > 99) return "99+";
  return String(count);
}
