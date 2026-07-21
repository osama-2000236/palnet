import type { Message } from "@baydar/shared";
import type { MessageStatus } from "@baydar/ui-native";

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

// expo-router colocation: not a screen.
export default (): null => null;
