import {
  hasStanding,
  normalizeOccupation,
  occupationByKey,
  PS_OCCUPATIONS,
  PS_OCCUPATION_FAMILIES,
  PS_PROFESSIONAL_BODIES,
  standingLabelKey,
  Track,
  trackOf,
} from "./occupations";
// Governorate and region live beside the city list they derive from.
import { governorateOfCity, proximityScore, regionOfGovernorate } from "./palestine";

describe("occupation taxonomy integrity", () => {
  it("every occupation points at a family that exists", () => {
    const familyKeys = new Set(PS_OCCUPATION_FAMILIES.map((f) => f.key));
    const orphans = PS_OCCUPATIONS.filter((o) => !familyKeys.has(o.family)).map((o) => o.key);
    expect(orphans).toEqual([]);
  });

  it("keys are unique across occupations and across families", () => {
    const occKeys = PS_OCCUPATIONS.map((o) => o.key);
    const famKeys = PS_OCCUPATION_FAMILIES.map((f) => f.key);
    expect(new Set(occKeys).size).toBe(occKeys.length);
    expect(new Set(famKeys).size).toBe(famKeys.length);
  });

  it("no two occupations resolve from the same input string", () => {
    const seen = new Map<string, string>();
    const collisions: string[] = [];
    for (const occ of PS_OCCUPATIONS) {
      for (const term of [occ.ar, ...(occ.synonyms ?? [])]) {
        const prior = seen.get(term);
        if (prior && prior !== occ.key) collisions.push(`${term}: ${prior} vs ${occ.key}`);
        seen.set(term, occ.key);
      }
    }
    expect(collisions).toEqual([]);
  });

  it("only CRAFT families carry a Standing label set", () => {
    const wrong = PS_OCCUPATION_FAMILIES.filter(
      (f) => (f.track === Track.CRAFT) !== Boolean(f.standingLabels),
    ).map((f) => f.key);
    expect(wrong).toEqual([]);
  });

  it("every professional body licenses a family that exists", () => {
    const familyKeys = new Set(PS_OCCUPATION_FAMILIES.map((f) => f.key));
    for (const body of PS_PROFESSIONAL_BODIES) {
      for (const fam of body.families) expect(familyKeys.has(fam)).toBe(true);
    }
  });

  it("carries no banned vocabulary — أسطى and صنايعي are input synonyms only, never stored", () => {
    // 0 occurrences in the official classification (OCCUPATIONS.md §1), so they
    // may never be a canonical label.
    const banned = ["أسطى", "صنايعي", "فني أول", "معتمد", "مرخّص"];
    const hits = PS_OCCUPATIONS.filter((o) => banned.some((b) => o.ar.includes(b))).map(
      (o) => o.key,
    );
    expect(hits).toEqual([]);
  });
});

describe("normalizeOccupation", () => {
  it("resolves canonical Arabic, English and folded variants", () => {
    expect(normalizeOccupation("كهربائي مباني")).toBe("building-electrician");
    expect(normalizeOccupation("Building Electrician")).toBe("building-electrician");
    // folded: alef and yaa variants must agree
    expect(normalizeOccupation("كهربائى مبانى")).toBe("building-electrician");
  });

  it("resolves the colloquial word to the official occupation", () => {
    // the classification's سباكة means metal casting, so سبّاك must land on تمديدات صحية
    expect(normalizeOccupation("سبّاك")).toBe("sanitary-fitter");
    expect(normalizeOccupation("بلّاط")).toBe("tiler");
    // aluminium work is officially a metal trade, not carpentry
    expect(normalizeOccupation("نجار ألمنيوم")).toBe("aluminium-smith");
  });

  it("returns null rather than guessing", () => {
    expect(normalizeOccupation("")).toBeNull();
    expect(normalizeOccupation("   ")).toBeNull();
    expect(normalizeOccupation("رائد فضاء")).toBeNull();
  });
});

describe("tracks and standing", () => {
  it("crafts earn a standing, licensed professions and services do not", () => {
    expect(trackOf("tiler")).toBe(Track.CRAFT);
    expect(trackOf("auditor")).toBe(Track.LICENSED);
    expect(trackOf("driver")).toBe(Track.SERVICE);
    expect(hasStanding("tiler")).toBe(true);
    expect(hasStanding("auditor")).toBe(false);
    expect(hasStanding("driver")).toBe(false);
  });

  it("resolves the per-family label set, so an electrician is not labelled like a painter", () => {
    expect(standingLabelKey("building-painter", 3)).toBe("occupations.standing.default.3.masc");
    expect(standingLabelKey("building-electrician", 3)).toBe(
      "occupations.standing.technical.3.masc",
    );
  });

  it("carries the feminine form", () => {
    expect(standingLabelKey("tailor", 4, "fem")).toBe("occupations.standing.default.4.fem");
  });

  it("refuses to fabricate a rung", () => {
    // no ladder on these tracks
    expect(standingLabelKey("auditor", 3)).toBeNull();
    expect(standingLabelKey("driver", 1)).toBeNull();
    // out of range or unknown
    expect(standingLabelKey("tiler", 0)).toBeNull();
    expect(standingLabelKey("tiler", 5)).toBeNull();
    expect(standingLabelKey("tiler", 2.5)).toBeNull();
    expect(standingLabelKey("nope", 2)).toBeNull();
  });

  it("occupationByKey round-trips", () => {
    expect(occupationByKey("stone-mason")?.ar).toBe("بناء حجر");
    expect(occupationByKey("nope")).toBeUndefined();
  });
});

describe("geography", () => {
  it("derives the governorate from Arabic, English or key", () => {
    expect(governorateOfCity("رام الله")).toBe("ramallah");
    expect(governorateOfCity("Nablus")).toBe("nablus");
    expect(governorateOfCity("beit-jala")).toBe("bethlehem");
    expect(governorateOfCity("دير البلح")).toBe("deir-al-balah");
  });

  it("returns null for diaspora and empty input instead of a wrong answer", () => {
    expect(governorateOfCity("عمّان")).toBeNull();
    expect(governorateOfCity("")).toBeNull();
    expect(governorateOfCity(null)).toBeNull();
  });

  it("splits the two regions", () => {
    expect(regionOfGovernorate("jenin")).toBe("WEST_BANK");
    expect(regionOfGovernorate("rafah")).toBe("GAZA");
    expect(regionOfGovernorate("nope")).toBeNull();
  });

  it("scores a cross-region pair at zero, not merely low", () => {
    // a job nobody can physically reach is not a weak match
    expect(proximityScore("جنين", "رفح")).toBe(0);
    expect(proximityScore("غزة", "خان يونس")).toBe(0.6);
    expect(proximityScore("نابلس", "نابلس")).toBe(1);
    expect(proximityScore("لندن", "نابلس")).toBe(0.3);
  });
});
