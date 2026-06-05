import type { Message } from "@baydar/shared";
import type { MessageStatus } from "@baydar/ui-web";

export const ONLINE_WINDOW_MS = 2 * 60 * 1000;
export const TYPING_TTL_MS = 5 * 1000;
export const TYPING_POST_THROTTLE_MS = 3 * 1000;

export function computeStatus(
  message: Message,
  failedClientIds: Set<string>,
  otherLastReadAtMs: number,
): MessageStatus {
  if (message.clientMessageId && failedClientIds.has(message.clientMessageId)) {
    return "failed";
  }
  if (message.id.startsWith("pending-")) return "sending";
  const createdAtMs = Date.parse(message.createdAt);
  if (otherLastReadAtMs >= createdAtMs) return "read";
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

export function shortDate(iso: string, locale: string): string {
  try {
    const tag = locale.toLowerCase().startsWith("ar") ? `${locale}-u-nu-arab` : locale;
    return new Date(iso).toLocaleString(tag, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export function shortDayLabel(iso: string, locale: string): string {
  try {
    const tag = locale.toLowerCase().startsWith("ar") ? `${locale}-u-nu-arab` : locale;
    return new Date(iso).toLocaleDateString(tag, {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

export function isSameLocalDay(aIso: string, bIso: string): boolean {
  const a = new Date(aIso);
  const b = new Date(bIso);
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
