// Message-thread state, shared by both platforms.
//
// These four functions and two constants existed twice — `apps/web/.../
// messages/_utils.ts` and `apps/mobile/src/screens/message-thread/utils.ts` —
// with the same bodies under drifted names (`isSameDay` vs `isSameLocalDay`)
// and their own inline copy of the Arabic digit tag `localeTag` already owns.
// Two copies of "when is a message read" is how one platform quietly stops
// agreeing with the other about what the user is looking at.
//
// What stayed per-platform is what genuinely differs: the day-separator and
// room-timestamp formats, which are different surfaces, not the same one drawn
// twice.

import { localeTag } from "./format";
import type { Message } from "./schemas/message";

/** How long a typing indicator survives with no further event. */
export const TYPING_TTL_MS = 5_000;
/** Floor between two outgoing typing pings. */
export const TYPING_POST_THROTTLE_MS = 3_000;

/**
 * Delivery state of one message.
 *
 * Declared here *and* as `MessageStatus` in both UI kits: the kits may not
 * import this package (CLAUDE.md — shared UI is framework-neutral), so the
 * union is stated where each side needs it. Structural typing keeps the bubble
 * props assignable, and the two kits' copies are identical by test.
 */
export type MessageDeliveryStatus = "sending" | "sent" | "delivered" | "read" | "failed";

/**
 * `failed` beats `sending`: a message whose optimistic id is in the failed set
 * has already come back from the server, so its pending id is stale.
 */
export function computeStatus(
  message: Message,
  failedClientIds: Set<string>,
  otherLastReadAtMs: number,
): MessageDeliveryStatus {
  if (message.clientMessageId && failedClientIds.has(message.clientMessageId)) return "failed";
  if (message.id.startsWith("pending-")) return "sending";
  if (otherLastReadAtMs >= Date.parse(message.createdAt)) return "read";
  return "sent";
}

/**
 * Insert or replace, matching on either id. `clientMessageId` is what lets the
 * server's echo land on top of the optimistic row instead of beside it.
 */
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

/** Local calendar day, not UTC — the separator marks the reader's day. */
export function isSameLocalDay(aIso: string, bIso: string): boolean {
  const a = new Date(aIso);
  const b = new Date(bIso);
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Clock time on a bubble. Empty string on an unparseable date.
 *
 * The `NaN` check is the half both copies were missing: `toLocaleTimeString`
 * on an invalid Date does not throw, it returns the literal `"Invalid Date"`,
 * so the try/catch caught a bad locale tag and printed that string into the
 * message bubble. The catch still earns its place — `Intl` throws `RangeError`
 * on a malformed tag.
 */
export function shortTime(iso: string, locale: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  try {
    return date.toLocaleTimeString(localeTag(locale), {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}
