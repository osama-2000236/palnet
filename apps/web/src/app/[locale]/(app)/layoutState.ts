import { ChatRoom as ChatRoomSchema, type ChatRoom } from "@baydar/shared";
import type { AppShellRoute } from "@baydar/ui-web";
import { z } from "zod";

export const UnreadCount = z.object({ count: z.number().int().nonnegative() });
export const RoomsEnvelope = z.object({ data: z.array(ChatRoomSchema) });

export function routeOf(pathname: string, myHandle: string | null): AppShellRoute | null {
  const path = pathname.replace(/^\/(?:ar-PS|en)(?=\/|$)/, "") || "/";
  if (path === "/" || path.startsWith("/feed")) return "feed";
  if (path.startsWith("/network")) return "network";
  if (path.startsWith("/jobs")) return "jobs";
  if (path.startsWith("/messages")) return "messages";
  if (path.startsWith("/notifications")) return "notifications";
  if (path.startsWith("/activity")) return "activity";
  if (path.startsWith("/saved")) return "saved";
  if (path.startsWith("/employer")) return "employer";
  if (path.startsWith("/me")) return "profile";
  if (myHandle && path === `/in/${myHandle}`) return "profile";
  return null;
}

export function isBareAppRoute(pathname: string): boolean {
  const path = pathname.replace(/^\/(?:ar-PS|en)(?=\/|$)/, "") || "/";
  return path.startsWith("/onboarding");
}

export function sumUnread(rooms: ChatRoom[]): number {
  return rooms.reduce((acc, r) => acc + r.unreadCount, 0);
}
