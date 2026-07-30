"use client";

import {
  TYPING_TTL_MS,
  upsertMessage,
  type ChatRoom,
  type Message,
  type WsChatEvent,
} from "@baydar/shared";
import {
  useCallback,
  useEffect,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";

import { apiCall } from "@/lib/api";
import { useMessagesStream } from "./useMessagesStream";

type TypingByRoom = Record<string, { userId: string; expiresAt: number }>;

interface UseRoomMessagesEventsInput {
  token: string | null;
  viewerId: string | null;
  activeRoomId: string | null;
  threadRef: MutableRefObject<HTMLDivElement | null>;
  setMessages: Dispatch<SetStateAction<Message[]>>;
  setRooms: Dispatch<SetStateAction<ChatRoom[]>>;
  setTypingUserByRoom: Dispatch<SetStateAction<TypingByRoom>>;
  setError(message: string | null): void;
  translate(message: "connectionLost" | "connectionFailed"): string;
}

export function useRoomMessagesEvents({
  token,
  viewerId,
  activeRoomId,
  threadRef,
  setMessages,
  setRooms,
  setTypingUserByRoom,
  setError,
  translate,
}: UseRoomMessagesEventsInput): void {
  const handleEvent = useCallback(
    (event: WsChatEvent): void => {
      if (event.type === "message.new") {
        const message = event.payload;
        setMessages((prev) => reconcileNewMessage(prev, message, activeRoomId));
        setRooms((prev) => updateRoomForMessage(prev, message, activeRoomId, viewerId));
        setTypingUserByRoom((prev) => removeTypingRoom(prev, message.roomId));
        if (message.roomId === activeRoomId && token) {
          requestAnimationFrame(() => {
            if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
          });
          if (message.authorId !== viewerId) {
            void apiCall(`/messaging/rooms/${message.roomId}/read`, {
              method: "POST",
              token,
            }).catch(() => {});
          }
        }
        return;
      }

      if (event.type === "message.edited" || event.type === "message.deleted") {
        const message = event.payload;
        setMessages((prev) =>
          message.roomId === activeRoomId ? upsertMessage(prev, message) : prev,
        );
        setRooms((prev) =>
          prev.map((room) =>
            room.id === message.roomId
              ? {
                  ...room,
                  lastMessage: message,
                  // Keep sort order stable: edits don't bump room position.
                  updatedAt: room.updatedAt,
                }
              : room,
          ),
        );
        return;
      }

      if (event.type === "message.read") {
        const { roomId, userId, at } = event.payload;
        setRooms((prev) => updateRoomReadReceipt(prev, roomId, userId, at));
        return;
      }

      if (event.type === "typing" && event.payload.userId !== viewerId) {
        const { roomId, userId } = event.payload;
        setTypingUserByRoom((prev) => ({
          ...prev,
          [roomId]: { userId, expiresAt: Date.now() + TYPING_TTL_MS },
        }));
      }
    },
    [activeRoomId, setMessages, setRooms, setTypingUserByRoom, threadRef, token, viewerId],
  );

  useMessagesStream({
    token,
    onEvent: handleEvent,
    onError: (message) => setError(translate(message)),
  });

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setTypingUserByRoom((prev) => pruneExpiredTyping(prev));
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, [setTypingUserByRoom]);
}

function reconcileNewMessage(
  current: Message[],
  message: Message,
  activeRoomId: string | null,
): Message[] {
  if (message.roomId !== activeRoomId) return current;
  const idx = current.findIndex(
    (item) => item.clientMessageId && item.clientMessageId === message.clientMessageId,
  );
  if (idx >= 0) {
    const next = current.slice();
    next[idx] = message;
    return next;
  }
  if (current.some((item) => item.id === message.id)) return current;
  return [...current, message];
}

function updateRoomForMessage(
  rooms: ChatRoom[],
  message: Message,
  activeRoomId: string | null,
  viewerId: string | null,
): ChatRoom[] {
  return rooms
    .map((room) => {
      if (room.id !== message.roomId) return room;
      const isActive = room.id === activeRoomId;
      return {
        ...room,
        lastMessage: message,
        unreadCount: isActive || message.authorId === viewerId ? 0 : room.unreadCount + 1,
        updatedAt: message.createdAt,
      };
    })
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

function updateRoomReadReceipt(
  rooms: ChatRoom[],
  roomId: string,
  userId: string,
  at: string,
): ChatRoom[] {
  return rooms.map((room) =>
    room.id === roomId
      ? {
          ...room,
          members: room.members.map((member) =>
            member.userId === userId ? { ...member, lastReadAt: at } : member,
          ),
        }
      : room,
  );
}

function removeTypingRoom(current: TypingByRoom, roomId: string): TypingByRoom {
  if (!current[roomId]) return current;
  const next = { ...current };
  delete next[roomId];
  return next;
}

function pruneExpiredTyping(current: TypingByRoom): TypingByRoom {
  const now = Date.now();
  let changed = false;
  const next: TypingByRoom = {};
  for (const [roomId, entry] of Object.entries(current)) {
    if (entry.expiresAt > now) next[roomId] = entry;
    else changed = true;
  }
  return changed ? next : current;
}
