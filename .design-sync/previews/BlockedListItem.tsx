import { BlockedListItem, Surface } from "@baydar/ui-web";

const noop = (): void => undefined;

const item = {
  id: "b_1",
  blockedUserId: "u_2",
  blockedHandle: "omar-h",
  blockedDisplayName: "عمر حجازي",
  blockedAvatarUrl: null,
  createdAt: "2026-06-02T10:00:00.000Z",
};

// BlockedListItem renders an <li> — it belongs to the blocked-users list, so
// the preview composes the list around it.
export const BlockedList = () => (
  <Surface variant="card" padding="4" className="max-w-[460px]">
    <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
      <BlockedListItem item={item} onUnblock={noop} labels={{ unblock: "إلغاء الحظر" }} />
      <BlockedListItem
        item={{
          ...item,
          id: "b_2",
          blockedUserId: "u_7",
          blockedHandle: "rana-k",
          blockedDisplayName: "رنا خليل",
        }}
        onUnblock={noop}
        labels={{ unblock: "إلغاء الحظر" }}
      />
    </ul>
  </Surface>
);

export const Loading = () => (
  <Surface variant="card" padding="4" className="max-w-[460px]">
    <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
      <BlockedListItem item={item} onUnblock={noop} labels={{ unblock: "إلغاء الحظر" }} loading />
    </ul>
  </Surface>
);
