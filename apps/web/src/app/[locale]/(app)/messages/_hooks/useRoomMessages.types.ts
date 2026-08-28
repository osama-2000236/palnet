import {
  ChatRoom as ChatRoomSchema,
  CursorPageMeta,
  Message as MessageSchema,
  type ChatRoom,
  type Message,
} from "@baydar/shared";
import type { GroupedMessage } from "@baydar/ui-web";
import type { MutableRefObject } from "react";
import { z } from "zod";

export const RoomsEnvelope = z.object({ data: z.array(ChatRoomSchema) });
export const MessagesPageEnvelope = z.object({
  data: z.array(MessageSchema),
  meta: CursorPageMeta,
});

export interface UseRoomMessagesInput {
  token: string | null;
  viewerId: string | null;
}

export interface UseRoomMessagesResult {
  /** Failure of the room *list*, shown in the inbox pane rather than the thread. */
  roomsError: string | null;
  retryRooms: () => void;
  rooms: ChatRoom[];
  filteredRooms: ChatRoom[];
  activeRoomId: string | null;
  activeRoom: ChatRoom | null;
  otherMember: ChatRoom["members"][number] | null;
  memberById: Map<string, ChatRoom["members"][number]>;
  otherOnline: boolean;
  messages: Message[];
  grouped: GroupedMessage<Message>[];
  hasMore: boolean;
  draft: string;
  sending: boolean;
  searchTerm: string;
  failedClientIds: Set<string>;
  error: string | null;
  actionMessage: Message | null;
  reportMessage: Message | null;
  editingBody: string;
  activeTyping: { userId: string; expiresAt: number } | null;
  firstUnreadIndex: number;
  unreadCount: number;
  otherLastReadAtMs: number;
  threadRef: MutableRefObject<HTMLDivElement | null>;
  firstUnreadRef: MutableRefObject<HTMLDivElement | null>;
  setActiveRoomId(roomId: string | null): void;
  setDraft(value: string): void;
  setSearchTerm(value: string): void;
  setError(value: string | null): void;
  setActionMessage(value: Message | null): void;
  setReportMessage(value: Message | null): void;
  setEditingBody(value: string): void;
  loadOlder(): void;
  scrollToUnread(): void;
  postTypingThrottled(): void;
  submit(): Promise<void>;
  retryFailed(clientMessageId: string): Promise<void>;
  saveEdit(): Promise<void>;
  deleteMessage(message: Message): Promise<void>;
}
