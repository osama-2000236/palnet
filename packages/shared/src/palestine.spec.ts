import {
  PS_CITIES,
  PS_GOVERNORATES,
  PS_INDUSTRIES,
  PS_UNIVERSITIES,
  governorateOfCity,
  normalizeCity,
  proximityScore,
  regionOfGovernorate,
} from "./palestine";

describe("PS_INDUSTRIES", () => {
  it("has unique keys and both language labels", () => {
    const keys = PS_INDUSTRIES.map((i) => i.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const industry of PS_INDUSTRIES) {
      expect(industry.ar.length).toBeGreaterThan(0);
      expect(industry.en.length).toBeGreaterThan(0);
    }
  });

  it("leads with NGO and international-organization sectors", () => {
    expect(PS_INDUSTRIES[0]!.key).toBe("ngo");
    expect(PS_INDUSTRIES[1]!.key).toBe("intl-org");
  });
});

describe("normalizeCity Arabic folding", () => {
  it("canonicalizes teh-marbuta and hamza variants", () => {
    expect(normalizeCity("قلقيليه")).toBe("قلقيلية");
    expect(normalizeCity("اريحا")).toBe("أريحا");
  });
});

describe("palestine data", () => {
  // Exact counts, not a floor: the shipped table silently carried 13 of the 16
  // official governorates for months, and a floor assertion is what let it.
  it("covers all sixteen official governorates and their 93 cities", () => {
    expect(PS_GOVERNORATES).toHaveLength(16);
    expect(PS_CITIES).toHaveLength(93);
    for (const gov of PS_GOVERNORATES) {
      expect(gov.ar).toBeTruthy();
      expect(gov.en).toBeTruthy();
      expect(gov.cities.length).toBeGreaterThan(0);
      for (const city of gov.cities) {
        expect(city.ar).toBeTruthy();
        expect(city.en).toBeTruthy();
      }
    }
  });

  it("includes the three governorates that were missing", () => {
    const keys = PS_GOVERNORATES.map((g) => g.key);
    expect(keys).toEqual(expect.arrayContaining(["salfit", "tubas", "north-gaza"]));
    expect(regionOfGovernorate("salfit")).toBe("WEST_BANK");
    expect(regionOfGovernorate("tubas")).toBe("WEST_BANK");
    expect(regionOfGovernorate("north-gaza")).toBe("GAZA");
  });

  it("has unique city keys and resolves every city to its governorate", () => {
    const keys = PS_CITIES.map((c) => c.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const gov of PS_GOVERNORATES) {
      for (const city of gov.cities) {
        expect(governorateOfCity(city.ar)).toBe(gov.key);
        expect(governorateOfCity(city.en)).toBe(gov.key);
      }
    }
  });

  // The expansion must not move a pair that already scored. A new city inside
  // an existing governorate is additive; a moved one re-ranks live jobs.
  it("leaves proximity unchanged for the pairs that already existed", () => {
    expect(proximityScore("رام الله", "رام الله")).toBe(1);
    expect(proximityScore("رام الله", "نابلس")).toBe(0.6);
    expect(proximityScore("رام الله", "غزة")).toBe(0);
    expect(proximityScore("بيت لحم", "بيت جالا")).toBe(1);
    expect(proximityScore("Berlin", "رام الله")).toBe(0.3);
  });

  it("lists every institution with ar/en names and an EDU_EMAIL domain or an explicit null", () => {
    expect(PS_UNIVERSITIES).toHaveLength(22);
    const keys = PS_UNIVERSITIES.map((u) => u.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const u of PS_UNIVERSITIES) {
      expect(u.ar).toBeTruthy();
      expect(u.en).toBeTruthy();
      // null is a decision (no EDU_EMAIL path), "" or undefined is a mistake.
      expect(u.domain === null || (typeof u.domain === "string" && u.domain.length > 0)).toBe(true);
      if (u.domain) expect(u.domain).toBe(u.domain.toLowerCase().replace(/^www\./, ""));
    }
  });
});

describe("normalizeCity", () => {
  it("canonicalizes English input to the Arabic city name", () => {
    expect(normalizeCity(" ramallah ")).toBe("رام الله");
    expect(normalizeCity("GAZA")).toBe("غزة");
  });

  it("keeps canonical Arabic input as-is", () => {
    expect(normalizeCity("رام الله")).toBe("رام الله");
  });

  it("passes unknown (diaspora) cities through trimmed", () => {
    expect(normalizeCity("  Berlin  ")).toBe("Berlin");
    expect(normalizeCity("")).toBe("");
  });
});
