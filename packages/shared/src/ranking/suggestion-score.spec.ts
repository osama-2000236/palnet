import {
  SuggestionReason,
  compareSuggestions,
  suggestionReason,
  suggestionScore,
  type SuggestionInput,
} from "./suggestion-score";

const NOTHING: SuggestionInput = {
  mutuals: 0,
  sameOccupationFamily: false,
  alumniOverlap: false,
  proximity: 0,
  sharedCompanyEver: false,
  sameOriginGovernorate: false,
  candidateFollowsViewer: false,
  evidenceScore: 0,
};

const only = (over: Partial<SuggestionInput>): SuggestionInput => ({ ...NOTHING, ...over });

describe("the fairness boundary", () => {
  // This is the test that enforces Rule 1, not the gate. The gate greps a
  // service; this pins the input type itself, so a subscription cannot become
  // a ranking signal without deleting an assertion somebody has to justify.
  it("scores from exactly these eight things and nothing else", () => {
    expect(Object.keys(NOTHING).sort()).toEqual([
      "alumniOverlap",
      "candidateFollowsViewer",
      "evidenceScore",
      "mutuals",
      "proximity",
      "sameOccupationFamily",
      "sameOriginGovernorate",
      "sharedCompanyEver",
    ]);
  });

  it("scores a stranger at zero rather than at something small", () => {
    expect(suggestionScore(NOTHING)).toBe(0);
    expect(suggestionReason(NOTHING)).toBeNull();
  });
});

describe("each term", () => {
  it("pays its stated weight at full strength", () => {
    expect(suggestionScore(only({ mutuals: 8 }))).toBeCloseTo(22);
    expect(suggestionScore(only({ sameOccupationFamily: true }))).toBeCloseTo(18);
    expect(suggestionScore(only({ alumniOverlap: true }))).toBeCloseTo(14);
    expect(suggestionScore(only({ proximity: 1 }))).toBeCloseTo(12);
    expect(suggestionScore(only({ sharedCompanyEver: true }))).toBeCloseTo(10);
    expect(suggestionScore(only({ sameOriginGovernorate: true }))).toBeCloseTo(8);
    expect(suggestionScore(only({ candidateFollowsViewer: true }))).toBeCloseTo(8);
    expect(suggestionScore(only({ evidenceScore: 100 }))).toBeCloseTo(8);
  });

  it("saturates mutual connections at eight", () => {
    // The ninth mutual connection tells you nothing the eighth did not.
    expect(suggestionScore(only({ mutuals: 8 }))).toBeCloseTo(22);
    expect(suggestionScore(only({ mutuals: 40 }))).toBeCloseTo(22);
    expect(suggestionScore(only({ mutuals: 4 }))).toBeCloseTo(11);
  });

  it("clamps every out-of-range input instead of trusting it", () => {
    // A negative proximity or a 900 evidence score is a bug upstream, and the
    // scorer's job is to not amplify it into a top result.
    expect(suggestionScore(only({ proximity: 5 }))).toBeCloseTo(12);
    expect(suggestionScore(only({ proximity: -3 }))).toBe(0);
    expect(suggestionScore(only({ evidenceScore: 900 }))).toBeCloseTo(8);
    expect(suggestionScore(only({ evidenceScore: -50 }))).toBe(0);
    expect(suggestionScore(only({ mutuals: -1 }))).toBe(0);
  });

  it("gives a different region nothing, not a small amount", () => {
    // proximityScore returns 0 across the Gaza/West Bank line, and it means
    // "not a match" rather than "far" — travel between them is not possible.
    expect(suggestionScore(only({ proximity: 0 }))).toBe(0);
  });

  it("adds up when several apply", () => {
    const score = suggestionScore(only({ mutuals: 4, sameOccupationFamily: true, proximity: 1 }));
    expect(score).toBeCloseTo(11 + 18 + 12);
  });
});

describe("the reason a card shows", () => {
  it("is the highest-weighted term that is not zero", () => {
    expect(suggestionReason(only({ mutuals: 1, sameOccupationFamily: true }))).toBe(
      SuggestionReason.SHARED_CONNECTIONS,
    );
    expect(suggestionReason(only({ sameOccupationFamily: true, proximity: 1 }))).toBe(
      SuggestionReason.SAME_FAMILY,
    );
    expect(suggestionReason(only({ evidenceScore: 90 }))).toBe(SuggestionReason.ESTABLISHED);
  });

  it("prefers the more useful sentence over the higher-scoring one", () => {
    // One mutual scores 2.75 against SAME_FAMILY's 18, and «معرفة مشتركة» is
    // still better to say: it names a person, and a person is checkable.
    const input = only({ mutuals: 1, sameOccupationFamily: true });
    expect(suggestionScore(input)).toBeCloseTo(2.75 + 18);
    expect(suggestionReason(input)).toBe(SuggestionReason.SHARED_CONNECTIONS);
  });

  it("never names a term that contributed nothing", () => {
    expect(suggestionReason(only({ proximity: 0, evidenceScore: 0, mutuals: 0 }))).toBeNull();
  });
});

describe("ordering", () => {
  const at = (score: number, evidenceScore = 0, createdAt = 0) => ({
    score,
    evidenceScore,
    createdAt,
  });

  it("puts the higher score first", () => {
    expect([at(10), at(30), at(20)].sort(compareSuggestions).map((c) => c.score)).toEqual([
      30, 20, 10,
    ]);
  });

  it("breaks a tie on evidence, then on recency", () => {
    // Never on anything a member could buy — that is Rule 1 at the last step,
    // where a tie-break is the easiest place to smuggle one in.
    const sorted = [at(20, 10, 5), at(20, 90, 1), at(20, 10, 9)].sort(compareSuggestions);
    expect(sorted.map((c) => [c.evidenceScore, c.createdAt])).toEqual([
      [90, 1],
      [10, 9],
      [10, 5],
    ]);
  });
});
