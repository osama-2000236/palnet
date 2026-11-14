import type { Message } from "@baydar/shared";
import type { MessageStatus } from "@baydar/ui-native";

export function computeStatus(
  m: Message,
  failedClientIds: Set<string>,
  otherLastReadAtMs: number,
): MessageStatus {
  if (m.clientMessageId && failedClientIds.has(m.clientMessageId)) {
    return "failed";
  }
  if (m.id.startsWith("pending-")) return "sending";
  const createdAtMs = Date.parse(m.createdAt);
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
