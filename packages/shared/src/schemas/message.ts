import { z } from "zod";

export const CreateOrGetDmBody = z.object({
  otherUserId: z.string().cuid(),
});
export type CreateOrGetDmBody = z.infer<typeof CreateOrGetDmBody>;

export const CreateGroupRoomBody = z.object({
  isGroup: z.literal(true),
  memberIds: z.array(z.string().cuid()).min(2).max(25),
  title: z.string().min(1).max(80),
});
export type CreateGroupRoomBody = z.infer<typeof CreateGroupRoomBody>;

export const CreateRoomBody = z.union([CreateOrGetDmBody, CreateGroupRoomBody]);
export type CreateRoomBody = z.infer<typeof CreateRoomBody>;

export const SendMessageBody = z.object({
  body: z.string().min(1).max(5000),
  mediaUrl: z.string().url().optional(),
  clientMessageId: z.string().min(1).max(64), // for idempotency + optimistic UI
});
export type SendMessageBody = z.infer<typeof SendMessageBody>;

export const UpdateMessageBody = z.object({
  body: z.string().min(1).max(5000),
});
export type UpdateMessageBody = z.infer<typeof UpdateMessageBody>;

export const Message = z.object({
  id: z.string().cuid(),
  roomId: z.string().cuid(),
  authorId: z.string().cuid(),
  body: z.string(),
  mediaUrl: z.string().url().nullable(),
  createdAt: z.string().datetime(),
  editedAt: z.string().datetime().nullable(),
  deletedAt: z.string().datetime().nullable(),
  clientMessageId: z.string().nullable(),
});
export type Message = z.infer<typeof Message>;

export const ChatRoom = z.object({
  id: z.string().cuid(),
  isGroup: z.boolean(),
  title: z.string().nullable(),
  lastMessage: Message.nullable(),
  unreadCount: z.number().int().nonnegative(),
  members: z.array(
    z.object({
      userId: z.string().cuid(),
      handle: z.string(),
      firstName: z.string(),
      lastName: z.string(),
      avatarUrl: z.string().url().nullable(),
      lastReadAt: z.string().datetime().nullable(),
      /**
       * Per-user "last active" timestamp sourced from User.lastSeenAt.
       * Presence is derived client-side: online = now - lastSeenAt < 2 min.
       */
      lastSeenAt: z.string().datetime().nullable(),
    }),
  ),
  updatedAt: z.string().datetime(),
});
export type ChatRoom = z.infer<typeof ChatRoom>;

// Realtime event payload shapes consumed by SSE channels.
export const WsChatEvent = z.discriminatedUnion("type", [
  z.object({ type: z.literal("message.new"), payload: Message }),
  z.object({ type: z.literal("message.edited"), payload: Message }),
  z.object({ type: z.literal("message.deleted"), payload: Message }),
  z.object({
    type: z.literal("message.read"),
    payload: z.object({
      roomId: z.string().cuid(),
      userId: z.string().cuid(),
      at: z.string().datetime(),
    }),
  }),
  z.object({
    type: z.literal("typing"),
    payload: z.object({ roomId: z.string().cuid(), userId: z.string().cuid() }),
  }),
]);
export type WsChatEvent = z.infer<typeof WsChatEvent>;
