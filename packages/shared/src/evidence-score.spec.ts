import { EMPTY_EVIDENCE, EvidenceSummary, evidenceScore } from "./evidence-score";

const evidence = (over: Partial<EvidenceSummary> = {}): EvidenceSummary => ({
  ...EMPTY_EVIDENCE,
  ...over,
});

const LICENCE = { bodyKey: "PEA", practice: "PRACTISING" } as const;

describe("evidenceScore", () => {
  it("scores an empty profile zero", () => {
    expect(evidenceScore(EMPTY_EVIDENCE)).toBe(0);
  });

  it("scores a fully-evidenced profile 100", () => {
    expect(
      evidenceScore(
        evidence({
          confirmedWorkProofs: 6,
          distinctCounterparties: 4,
          standing: { occupationKey: "CARPENTER", value: 4 },
          licence: { ...LICENCE, status: "VERIFIED" },
          recommendations: 3,
          verifications: ["PHONE", "WORK_EMAIL", "EDU_EMAIL", "PROFESSIONAL_BODY"],
        }),
      ),
    ).toBe(100);
  });

  it("caps at 100 when inputs run past saturation", () => {
    expect(
      evidenceScore(
        evidence({
          confirmedWorkProofs: 600,
          distinctCounterparties: 400,
          standing: { occupationKey: "CARPENTER", value: 4 },
          licence: { ...LICENCE, status: "VERIFIED" },
          recommendations: 300,
          verifications: ["PHONE", "WORK_EMAIL", "EDU_EMAIL", "PROFESSIONAL_BODY"],
        }),
      ),
    ).toBe(100);
  });

  it("weights each term as documented", () => {
    expect(evidenceScore(evidence({ confirmedWorkProofs: 6 }))).toBe(30);
    expect(evidenceScore(evidence({ distinctCounterparties: 4 }))).toBe(20);
    expect(evidenceScore(evidence({ standing: { occupationKey: "X", value: 4 } }))).toBe(15);
    expect(evidenceScore(evidence({ licence: { ...LICENCE, status: "VERIFIED" } }))).toBe(15);
    expect(evidenceScore(evidence({ recommendations: 3 }))).toBe(10);
    expect(
      evidenceScore(
        evidence({ verifications: ["PHONE", "WORK_EMAIL", "EDU_EMAIL", "PROFESSIONAL_BODY"] }),
      ),
    ).toBe(10);
  });

  it("prices an unverified licence below a verified one, and no licence at nothing", () => {
    // DECLARED and EXPIRED both score 0.3 of VERIFIED: each is a checkable
    // claim Baydar has not checked. The status the UI renders is what tells
    // the two apart, not the number.
    expect(evidenceScore(evidence({ licence: { ...LICENCE, status: "DECLARED" } }))).toBe(5); // 4.5
    expect(evidenceScore(evidence({ licence: { ...LICENCE, status: "EXPIRED" } }))).toBe(5);
    expect(evidenceScore(evidence({ licence: null }))).toBe(0);
  });

  it("separates proof count from relationship count", () => {
    // Six proofs from one client is one relationship. The counterparty term is
    // what says so, and it is the reason this pair is not equal.
    expect(evidenceScore(evidence({ confirmedWorkProofs: 6, distinctCounterparties: 1 }))).toBe(35);
    expect(evidenceScore(evidence({ confirmedWorkProofs: 6, distinctCounterparties: 4 }))).toBe(50);
  });

  it("scores a partly-verified account on the fraction of checks it passed", () => {
    expect(evidenceScore(evidence({ verifications: ["PHONE"] }))).toBe(3); // 2.5
    expect(evidenceScore(evidence({ verifications: ["PHONE", "WORK_EMAIL"] }))).toBe(5);
  });

  it("does not score ratings", () => {
    // A rating is somebody's opinion; the score is for things that happened.
    // §16.5 also makes ratings the most gameable input on the platform, and a
    // retaliatory one-star must not move a candidate down an employer's list.
    const rated = evidence({ ratingAvg: 5, ratingCount: 40 });
    const unrated = evidence({ ratingAvg: null, ratingCount: 0 });
    expect(evidenceScore(rated)).toBe(evidenceScore(unrated));
  });

  it("is monotone: no numeric input can lower the score by growing", () => {
    const base = evidence({
      confirmedWorkProofs: 2,
      distinctCounterparties: 1,
      standing: { occupationKey: "X", value: 2 },
      licence: { ...LICENCE, status: "DECLARED" },
      recommendations: 1,
      verifications: ["PHONE"],
    });
    const keys = ["confirmedWorkProofs", "distinctCounterparties", "recommendations"] as const;
    for (const key of keys) {
      expect(evidenceScore({ ...base, [key]: base[key] + 1 })).toBeGreaterThanOrEqual(
        evidenceScore(base),
      );
    }
    expect(evidenceScore({ ...base, standing: { occupationKey: "X", value: 3 } })).toBeGreaterThan(
      evidenceScore(base),
    );
    expect(evidenceScore({ ...base, licence: { ...LICENCE, status: "VERIFIED" } })).toBeGreaterThan(
      evidenceScore(base),
    );
  });

  it("takes no paid input (Rule 1)", () => {
    // The schema is closed and this asserts its exact key set. If somebody adds
    // a subscription tier, a boost, or any other purchasable term to the
    // summary, this fails before `check:ranking-purity` ever has to see it.
    expect(Object.keys(EvidenceSummary.shape).sort()).toEqual([
      "confirmedWorkProofs",
      "distinctCounterparties",
      "licence",
      "ratingAvg",
      "ratingCount",
      "recommendations",
      "standing",
      "verifications",
    ]);
  });

  it("rejects an out-of-range standing at the boundary", () => {
    expect(
      EvidenceSummary.safeParse({ ...EMPTY_EVIDENCE, standing: { occupationKey: "X", value: 5 } })
        .success,
    ).toBe(false);
  });
});
