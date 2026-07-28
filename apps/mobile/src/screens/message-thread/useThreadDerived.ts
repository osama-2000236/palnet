import type { ChatRoom, Message } from "@baydar/shared";
import { useMemo } from "react";

export function useThreadDerived({
  room,
  viewerId,
  messages,
}: {
  room: ChatRoom | null;
  viewerId: string | null;
  messages: Message[];
}) {
  const other = useMemo(
    () => (viewerId && room ? (room.members.find((m) => m.userId !== viewerId) ?? null) : null),
    [viewerId, room],
  );
  const otherName = other ? `${other.firstName} ${other.lastName}`.trim() || other.handle : "";
  const title = room?.isGroup ? (room.title ?? "") : otherName || (room?.title ?? "");
  const otherLastReadAtMs = other?.lastReadAt ? Date.parse(other.lastReadAt) : 0;
  const memberById = useMemo(() => {
    const map = new Map<string, ChatRoom["members"][number]>();
    for (const member of room?.members ?? []) map.set(member.userId, member);
    return map;
  }, [room]);
  const viewerLastReadAtMs = useMemo(() => {
    if (!viewerId || !room) return 0;
    const me = room.members.find((member) => member.userId === viewerId);
    return me?.lastReadAt ? Date.parse(me.lastReadAt) : 0;
  }, [room, viewerId]);
  const firstUnreadIndex = viewerLastReadAtMs
    ? messages.findIndex((message) => Date.parse(message.createdAt) > viewerLastReadAtMs)
    : -1;
  return {
    otherName,
    title,
    otherLastReadAtMs,
    memberById,
    firstUnreadIndex,
    unreadCount: firstUnreadIndex >= 0 ? messages.length - firstUnreadIndex : 0,
  };
}
