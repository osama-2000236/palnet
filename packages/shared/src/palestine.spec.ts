import {
  PS_CITIES,
  PS_GOVERNORATES,
  PS_INDUSTRIES,
  PS_UNIVERSITIES,
  normalizeCity,
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
  it("has governorates each with ar/en names and at least one city", () => {
    expect(PS_GOVERNORATES.length).toBeGreaterThanOrEqual(13);
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

  it("has unique city keys", () => {
    const keys = PS_CITIES.map((c) => c.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("lists the ten canonical universities with ar/en names", () => {
    expect(PS_UNIVERSITIES).toHaveLength(10);
    for (const u of PS_UNIVERSITIES) {
      expect(u.ar).toBeTruthy();
      expect(u.en).toBeTruthy();
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
