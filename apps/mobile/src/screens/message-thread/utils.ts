import { CursorPageMeta, localeTag, Message as MessageSchema, type ChatRoom } from "@baydar/shared";
import { z } from "zod";

// Message state, the typing constants and `shortTime` live in
// `@baydar/shared/messaging` — web had its own copy of all four. What is left
// here is mobile-only: the page envelope, the room-member name lookup, and a
// day separator that reads differently from web's.

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

// "اليوم"-style day label for thread separators. Weekday+date reads better
// than a bare date in a chat context; Arabic locales get Arabic-Indic digits.
export function dayLabel(iso: string, locale: string): string {
  const date = new Date(iso);
  // `toLocale*` renders the literal "Invalid Date" rather than throwing, so the
  // try/catch below (which is there for a malformed locale tag) never saw it.
  if (Number.isNaN(date.getTime())) return "";
  try {
    return date.toLocaleDateString(localeTag(locale), {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  } catch {
    return "";
  }
}
