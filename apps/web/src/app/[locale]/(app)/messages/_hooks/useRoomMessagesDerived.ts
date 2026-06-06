"use client";

import { type ChatRoom, type Message } from "@baydar/shared";
import { groupMessages } from "@baydar/ui-web";
import { useMemo } from "react";

import { ONLINE_WINDOW_MS } from "../_utils";

export function useRoomMessagesDerived({
  rooms,
  activeRoomId,
  messages,
  viewerId,
  searchTerm,
}: {
  rooms: ChatRoom[];
  activeRoomId: string | null;
  messages: Message[];
  viewerId: string | null;
  searchTerm: string;
}) {
  const activeRoom = useMemo(
    () => rooms.find((room) => room.id === activeRoomId) ?? null,
    [activeRoomId, rooms],
  );

  const otherMember = useMemo(() => {
    if (!activeRoom || !viewerId) return null;
    return activeRoom.members.find((member) => member.userId !== viewerId) ?? null;
  }, [activeRoom, viewerId]);

  const memberById = useMemo(() => {
    const map = new Map<string, ChatRoom["members"][number]>();
    for (const member of activeRoom?.members ?? []) map.set(member.userId, member);
    return map;
  }, [activeRoom]);

  const viewerLastReadAtMs = useMemo(() => {
    if (!activeRoom || !viewerId) return 0;
    const me = activeRoom.members.find((member) => member.userId === viewerId);
    return me?.lastReadAt ? Date.parse(me.lastReadAt) : 0;
  }, [activeRoom, viewerId]);

  const firstUnreadIndex = useMemo(() => {
    if (!viewerLastReadAtMs) return -1;
    return messages.findIndex((message) => Date.parse(message.createdAt) > viewerLastReadAtMs);
  }, [messages, viewerLastReadAtMs]);

  const otherLastReadAtMs = useMemo(() => {
    if (!otherMember?.lastReadAt) return 0;
    return Date.parse(otherMember.lastReadAt);
  }, [otherMember]);

  const otherOnline = useMemo(
    () =>
      otherMember?.lastSeenAt
        ? Date.now() - Date.parse(otherMember.lastSeenAt) < ONLINE_WINDOW_MS
        : false,
    [otherMember],
  );

  const filteredRooms = useMemo(() => {
    const q = searchTerm.trim().toLocaleLowerCase();
    if (!q) return rooms;
    return rooms.filter((room) => {
      const other = viewerId ? room.members.find((member) => member.userId !== viewerId) : null;
      const haystack = [
        other?.firstName,
        other?.lastName,
        other?.handle,
        room.title,
        room.lastMessage?.body,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase();
      return haystack.includes(q);
    });
  }, [rooms, searchTerm, viewerId]);

  const grouped = useMemo(
    () =>
      groupMessages(messages, {
        authorId: (message) => message.authorId,
        createdAt: (message) => message.createdAt,
      }),
    [messages],
  );

  return {
    activeRoom,
    otherMember,
    memberById,
    otherOnline,
    filteredRooms,
    grouped,
    firstUnreadIndex,
    otherLastReadAtMs,
  };
}
