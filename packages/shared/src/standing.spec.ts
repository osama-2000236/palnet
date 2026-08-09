import {
  STANDING_THRESHOLDS,
  StandingInput,
  isSelfConfirmation,
  standingFor,
  standingGap,
} from "./standing";

const NOTHING: StandingInput = {
  confirmedProofs: 0,
  distinctCounterparties: 0,
  spanDays: 0,
  vouchesFromMasters: 0,
  hasBodyRecommendation: false,
};

const evidence = (over: Partial<StandingInput> = {}): StandingInput => ({
  ...NOTHING,
  ...over,
});

const RUNG_2 = evidence({ confirmedProofs: 3, distinctCounterparties: 2 });
const RUNG_3 = evidence({ confirmedProofs: 10, distinctCounterparties: 5, spanDays: 180 });
const RUNG_4 = evidence({
  confirmedProofs: 25,
  distinctCounterparties: 12,
  spanDays: 540,
  vouchesFromMasters: 2,
});

describe("standingFor", () => {
  it("puts a new claim on rung 1", () => {
    expect(standingFor(NOTHING)).toBe(1);
  });

  it("awards each rung exactly at its thresholds", () => {
    expect(standingFor(RUNG_2)).toBe(2);
    expect(standingFor(RUNG_3)).toBe(3);
    expect(standingFor(RUNG_4)).toBe(4);
  });

  it("holds the rung when any single requirement is one short", () => {
    expect(standingFor({ ...RUNG_2, confirmedProofs: 2 })).toBe(1);
    expect(standingFor({ ...RUNG_2, distinctCounterparties: 1 })).toBe(1);
    expect(standingFor({ ...RUNG_3, spanDays: 179 })).toBe(2);
    expect(standingFor({ ...RUNG_3, distinctCounterparties: 4 })).toBe(2);
    expect(standingFor({ ...RUNG_4, spanDays: 539 })).toBe(3);
  });

  it("does not let volume alone reach the top", () => {
    // A thousand confirmations from one client in one week is a relationship,
    // not a career. Counterparties and span are what say so.
    expect(standingFor(evidence({ confirmedProofs: 1000, distinctCounterparties: 1 }))).toBe(1);
  });

  it("requires a sponsor for rung 4, and takes either kind", () => {
    const unsponsored = { ...RUNG_4, vouchesFromMasters: 0 };
    expect(standingFor(unsponsored)).toBe(3);
    expect(standingFor({ ...unsponsored, vouchesFromMasters: 1 })).toBe(3);
    expect(standingFor({ ...unsponsored, vouchesFromMasters: 2 })).toBe(4);
    expect(standingFor({ ...unsponsored, hasBodyRecommendation: true })).toBe(4);
  });

  it("never decays: no input can lower the rung by growing", () => {
    // This is the property behind "a standing is a credential, not a score".
    const bases = [NOTHING, RUNG_2, RUNG_3, { ...RUNG_4, vouchesFromMasters: 0 }];
    const keys = [
      "confirmedProofs",
      "distinctCounterparties",
      "spanDays",
      "vouchesFromMasters",
    ] as const;
    for (const base of bases) {
      for (const key of keys) {
        expect(standingFor({ ...base, [key]: base[key] + 1 })).toBeGreaterThanOrEqual(
          standingFor(base),
        );
      }
      expect(standingFor({ ...base, hasBodyRecommendation: true })).toBeGreaterThanOrEqual(
        standingFor(base),
      );
    }
  });

  it("cannot be bought (Rule 1)", () => {
    // Same closed-input assertion the evidence score carries. There is no key
    // here a payment could ever set.
    expect(Object.keys(NOTHING).sort()).toEqual([
      "confirmedProofs",
      "distinctCounterparties",
      "hasBodyRecommendation",
      "spanDays",
      "vouchesFromMasters",
    ]);
  });

  it("keeps the thresholds ascending, which is what makes the ladder a ladder", () => {
    // `standingFor` breaks on the first unmet rung. If the table were ever
    // reordered, that loop would silently stop early and cap everybody at 1.
    STANDING_THRESHOLDS.reduce((prev, next) => {
      expect(next.value).toBeGreaterThan(prev.value);
      expect(next.proofs).toBeGreaterThan(prev.proofs);
      expect(next.counterparties).toBeGreaterThan(prev.counterparties);
      expect(next.spanDays).toBeGreaterThanOrEqual(prev.spanDays);
      return next;
    });
  });
});

describe("standingGap", () => {
  it("tells a rung-1 member exactly what rung 2 costs", () => {
    expect(standingGap(evidence({ confirmedProofs: 1, distinctCounterparties: 1 }))).toEqual({
      next: 2,
      proofsShort: 2,
      counterpartiesShort: 1,
      daysShort: 0,
      needsSponsor: false,
    });
  });

  it("counts only what is still missing, never what is already surplus", () => {
    // Twelve proofs but two clients: the proof count is past rung 3's bar and
    // must not read as a negative shortfall.
    expect(standingGap(evidence({ confirmedProofs: 12, distinctCounterparties: 2 }))).toEqual({
      next: 3,
      proofsShort: 0,
      counterpartiesShort: 3,
      daysShort: 180,
      needsSponsor: false,
    });
  });

  it("names the sponsor requirement on the way to rung 4, and only there", () => {
    expect(standingGap(RUNG_3)?.needsSponsor).toBe(true);
    expect(standingGap({ ...RUNG_3, hasBodyRecommendation: true })?.needsSponsor).toBe(false);
    expect(standingGap(NOTHING)?.needsSponsor).toBe(false);
  });

  it("returns null at the top", () => {
    expect(standingGap(RUNG_4)).toBeNull();
  });
});

describe("isSelfConfirmation", () => {
  it("catches a member confirming their own work", () => {
    expect(isSelfConfirmation("u1", "u1")).toBe(true);
  });

  it("allows a real counterparty, and an off-platform one", () => {
    expect(isSelfConfirmation("u1", "u2")).toBe(false);
    expect(isSelfConfirmation("u1", null)).toBe(false);
  });
});
