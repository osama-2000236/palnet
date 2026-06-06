import { type ChatRoom, type Message, type WsChatEvent } from "@baydar/shared";
import type { Dispatch, SetStateAction } from "react";

import { apiCall } from "@/lib/api";
import { upsertMessage } from "./utils";

export function applyThreadEvent({
  event,
  roomId,
  token,
  setMessages,
  setRoom,
}: {
  event: WsChatEvent;
  roomId: string;
  token: string;
  setMessages: Dispatch<SetStateAction<Message[]>>;
  setRoom: Dispatch<SetStateAction<ChatRoom | null>>;
}): void {
  if (event.type === "message.new" && event.payload.roomId === roomId) {
    setMessages((prev) => upsertMessage(prev, event.payload));
    void apiCall(`/messaging/rooms/${roomId}/read`, { method: "POST", token }).catch(() => {});
  }
  if (
    (event.type === "message.edited" || event.type === "message.deleted") &&
    event.payload.roomId === roomId
  ) {
    setMessages((prev) => upsertMessage(prev, event.payload));
  }
  if (event.type === "message.read" && event.payload.roomId === roomId) {
    setRoom((current) =>
      current
        ? {
            ...current,
            members: current.members.map((member) =>
              member.userId === event.payload.userId
                ? { ...member, lastReadAt: event.payload.at }
                : member,
            ),
          }
        : current,
    );
  }
}

export function createOptimisticMessage({
  roomId,
  viewerId,
  body,
  clientMessageId,
}: {
  roomId: string;
  viewerId: string | null;
  body: string;
  clientMessageId: string;
}): Message {
  return {
    id: `pending-${clientMessageId}`,
    roomId,
    authorId: viewerId ?? "me",
    body,
    mediaUrl: null,
    clientMessageId,
    createdAt: new Date().toISOString(),
    editedAt: null,
    deletedAt: null,
  };
}
