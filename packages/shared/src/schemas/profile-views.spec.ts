import { SAFETY } from "../safety/thresholds";
import { anonymiseBuckets } from "./profile-views";

describe("anonymiseBuckets", () => {
  it("drops every bucket below k and counts what it dropped", () => {
    const { buckets, suppressed } = anonymiseBuckets({ GAZA: 9, HEBRON: 5, JENIN: 4, TULKARM: 1 });
    expect(buckets).toEqual([
      { key: "GAZA", count: 9 },
      { key: "HEBRON", count: 5 },
    ]);
    expect(suppressed).toBe(5);
  });

  it("keeps a bucket exactly at k", () => {
    const { buckets } = anonymiseBuckets({ GAZA: SAFETY.PROFILE_VIEW_K });
    expect(buckets).toHaveLength(1);
  });

  it("loses no views: shown plus suppressed is the total", () => {
    // The property that stops a member deducing a hidden bucket from a total
    // that does not add up.
    const counts = { A: 12, B: 5, C: 4, D: 3, E: 1 };
    const { buckets, suppressed } = anonymiseBuckets(counts);
    const shown = buckets.reduce((sum, b) => sum + b.count, 0);
    expect(shown + suppressed).toBe(Object.values(counts).reduce((a, b) => a + b, 0));
  });

  it("shows nothing at all when every bucket is small", () => {
    const { buckets, suppressed } = anonymiseBuckets({ A: 4, B: 3, C: 2 });
    expect(buckets).toEqual([]);
    expect(suppressed).toBe(9);
  });

  it("orders by size, then by key so the output is stable", () => {
    const { buckets } = anonymiseBuckets({ B: 7, A: 7, C: 9 });
    expect(buckets.map((b) => b.key)).toEqual(["C", "A", "B"]);
  });
});
