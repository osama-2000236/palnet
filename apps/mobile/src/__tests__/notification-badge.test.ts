import { nextNotificationBadge } from "@/lib/notification-badge";

const at = "2026-07-26T09:00:00.000Z";

describe("nextNotificationBadge", () => {
  it("takes the authoritative count from unread-count", () => {
    expect(
      nextNotificationBadge(9, { type: "notification.unread-count", payload: { count: 3 } }),
    ).toBe(3);
  });

  it("increments on a new notification", () => {
    expect(
      nextNotificationBadge(2, {
        type: "notification.new",
        payload: { id: "n_1" } as never,
      }),
    ).toBe(3);
  });

  // R2-12: a partial read used to zero the badge, and was only rescued by the
  // unread-count frame the server happens to publish next.
  it("decrements by the number of ids on a partial read", () => {
    expect(
      nextNotificationBadge(5, { type: "notification.read", payload: { ids: ["a", "b"], at } }),
    ).toBe(3);
  });

  it("never goes below zero", () => {
    expect(
      nextNotificationBadge(1, {
        type: "notification.read",
        payload: { ids: ["a", "b", "c"], at },
      }),
    ).toBe(0);
  });

  it("zeroes on the mark-all-read broadcast (empty ids)", () => {
    expect(nextNotificationBadge(12, { type: "notification.read", payload: { ids: [], at } })).toBe(
      0,
    );
  });
});
