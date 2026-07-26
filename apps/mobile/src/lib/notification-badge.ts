import type { WsNotificationEvent } from "@baydar/shared";

/**
 * Reduces the tab-bar unread badge against one notification SSE frame.
 *
 * `notification.read` carries the ids that were marked read; an empty array is
 * the mark-all-read broadcast. Treating every read frame as "all read" only
 * looked correct because `notification.unread-count` is published immediately
 * after and SSE preserves order — an ordering guarantee this reducer should not
 * have to depend on.
 */
export function nextNotificationBadge(count: number, event: WsNotificationEvent): number {
  switch (event.type) {
    case "notification.unread-count":
      return event.payload.count;
    case "notification.new":
      return count + 1;
    case "notification.read": {
      const read = event.payload.ids.length;
      return read === 0 ? 0 : Math.max(count - read, 0);
    }
  }
}
