import { computeStatus, isSameLocalDay, shortTime, upsertMessage } from "./messaging";
import type { Message } from "./schemas/message";

// Neither platform had a test for any of this while it existed twice. The two
// copies agreed by luck, and nothing would have said so if one had drifted.

const message = (over: Partial<Message> = {}): Message =>
  ({
    id: "cm00000000000000000000001",
    roomId: "cm00000000000000000000009",
    senderId: "cm00000000000000000000002",
    body: "مرحبا",
    createdAt: "2026-07-30T10:00:00.000Z",
    clientMessageId: null,
    ...over,
  }) as Message;

describe("computeStatus", () => {
  it("reports a failed send even while the optimistic row still looks pending", () => {
    const pending = message({ id: "pending-1", clientMessageId: "c1" });
    expect(computeStatus(pending, new Set(["c1"]), 0)).toBe("failed");
  });

  it("reports sending for an optimistic row nothing has failed", () => {
    expect(computeStatus(message({ id: "pending-1" }), new Set(), 0)).toBe("sending");
  });

  it("reports read once the other side's read cursor reaches the message", () => {
    const sent = message({ createdAt: "2026-07-30T10:00:00.000Z" });
    expect(computeStatus(sent, new Set(), Date.parse("2026-07-30T10:00:00.000Z"))).toBe("read");
    expect(computeStatus(sent, new Set(), Date.parse("2026-07-30T09:59:59.999Z"))).toBe("sent");
  });
});

describe("upsertMessage", () => {
  it("replaces the optimistic row rather than appending the server's echo beside it", () => {
    const optimistic = message({ id: "pending-1", clientMessageId: "c1" });
    const echo = message({ id: "cm00000000000000000000003", clientMessageId: "c1" });

    const next = upsertMessage([optimistic], echo);

    expect(next).toHaveLength(1);
    expect(next[0]?.id).toBe("cm00000000000000000000003");
  });

  it("appends a message it has not seen", () => {
    const next = upsertMessage([message()], message({ id: "cm00000000000000000000004" }));
    expect(next).toHaveLength(2);
  });
});

describe("day and time", () => {
  it("compares local calendar days, not UTC instants", () => {
    expect(isSameLocalDay("2026-07-30T00:30:00.000Z", "2026-07-30T23:30:00.000Z")).toBe(
      new Date("2026-07-30T00:30:00.000Z").getDate() ===
        new Date("2026-07-30T23:30:00.000Z").getDate(),
    );
    expect(isSameLocalDay("2026-07-30T10:00:00.000Z", "2026-08-02T10:00:00.000Z")).toBe(false);
  });

  it("renders Arabic-Indic digits for an Arabic locale and never throws", () => {
    expect(shortTime("2026-07-30T10:05:00.000Z", "ar-PS")).toMatch(/[٠-٩]/);
    expect(shortTime("2026-07-30T10:05:00.000Z", "en")).toMatch(/[0-9]/);
    expect(shortTime("not-a-date", "ar-PS")).toBe("");
  });
});
