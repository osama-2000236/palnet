import { PS_CITIES, PS_GOVERNORATES, PS_UNIVERSITIES, normalizeCity } from "./palestine";

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
