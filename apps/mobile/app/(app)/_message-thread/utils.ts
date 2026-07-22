import {
  CursorPageMeta,
  Message as MessageSchema,
  type ChatRoom,
  type Message,
} from "@baydar/shared";
import type { MessageStatus } from "@baydar/ui-native";
import { z } from "zod";

export const TYPING_TTL_MS = 5_000;
export const TYPING_POST_THROTTLE_MS = 3_000;

/** Cursor-paged message list as the API returns it. */
export const MessagesPageEnvelope = z.object({
  data: z.array(MessageSchema),
  meta: CursorPageMeta,
});

/**
 * Display name for whoever a room event refers to. Returns null when the member
 * isn't in the room snapshot, so callers can drop the label rather than render a
 * placeholder — "Messages is typing…" is worse than no indicator.
 */
export function memberDisplayName(
  memberById: Map<string, ChatRoom["members"][number]>,
  userId: string,
): string | null {
  const member = memberById.get(userId);
  if (!member) return null;
  return `${member.firstName} ${member.lastName}`.trim() || member.handle || null;
}

export function computeStatus(
  message: Message,
  failedClientIds: Set<string>,
  otherLastReadAtMs: number,
): MessageStatus {
  if (message.clientMessageId && failedClientIds.has(message.clientMessageId)) return "failed";
  if (message.id.startsWith("pending-")) return "sending";
  if (otherLastReadAtMs >= Date.parse(message.createdAt)) return "read";
  return "sent";
}

export function upsertMessage(current: Message[], incoming: Message): Message[] {
  const idx = current.findIndex(
    (item) =>
      item.id === incoming.id ||
      (!!item.clientMessageId && item.clientMessageId === incoming.clientMessageId),
  );
  if (idx === -1) return [...current, incoming];
  const next = current.slice();
  next[idx] = incoming;
  return next;
}

export function shortTime(iso: string, locale: string): string {
  try {
    const tag = locale.toLowerCase().startsWith("ar") ? `${locale}-u-nu-arab` : locale;
    return new Date(iso).toLocaleTimeString(tag, {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

// "اليوم"-style day label for thread separators. Weekday+date reads better
// than a bare date in a chat context; Arabic locales get Arabic-Indic digits.
export function dayLabel(iso: string, locale: string): string {
  try {
    const tag = locale.toLowerCase().startsWith("ar") ? `${locale}-u-nu-arab` : locale;
    return new Date(iso).toLocaleDateString(tag, {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  } catch {
    return "";
  }
}

export function isSameDay(a: string, b: string): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

// expo-router colocation: not a screen.
export default (): null => null;
