-- One skill, typed three ways, endorsed once.
--
-- "JS", "Javascript" and the Arabic transliteration are one skill, and today
-- they are three rows with three endorsement counts. Nobody has a number that
-- means anything, and the fragments get worse as the member base grows.
--
-- Folding reuses `baydar_fold()`, the function migration 202607160001 already
-- added for search. A second spelling of the same rules is a second answer,
-- and `foldSkillName()` in @baydar/shared is the TS twin a spec pins against
-- it. Lowercasing is on top of the fold, so "JavaScript" and "javascript"
-- cluster too -- Latin case is the other way one skill becomes three rows.

ALTER TABLE "Skill" ADD COLUMN "foldedName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Skill" ADD COLUMN "canonicalId" TEXT;

ALTER TABLE "Skill" ADD CONSTRAINT "Skill_canonicalId_fkey"
    FOREIGN KEY ("canonicalId") REFERENCES "Skill"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Arabic folding: strip tatweel and diacritics, unify alef/ya/teh-marbuta,
-- collapse whitespace, lowercase. Same rules, same order as arabic-fold.ts.
UPDATE "Skill" SET "foldedName" = lower(btrim(regexp_replace(baydar_fold("name"), '\s+', ' ', 'g')));

CREATE INDEX "Skill_foldedName_idx" ON "Skill"("foldedName");
CREATE INDEX "Skill_canonicalId_idx" ON "Skill"("canonicalId");

-- Point every alias at the oldest member of its cluster. Oldest rather than
-- most-endorsed: creation order is stable, and a "winner" that moves when
-- somebody endorses is a canonical row that renames itself.
WITH canonical AS (
    SELECT DISTINCT ON ("foldedName") "foldedName", "id"
    FROM "Skill"
    WHERE "foldedName" <> ''
    ORDER BY "foldedName", "createdAt" ASC, "id" ASC
)
UPDATE "Skill" s
SET "canonicalId" = c."id"
FROM canonical c
WHERE s."foldedName" = c."foldedName" AND s."id" <> c."id";

-- Sum the aliases' endorsements onto the canonical row.
--
-- The alias rows KEEP their own counts. This is deliberate and it is the
-- rollback: reversing the clustering means clearing canonicalId and re-reading
-- the per-alias numbers, which are still there. Dropping them here would make
-- this migration a one-way door.
INSERT INTO "ProfileSkill" ("profileId", "skillId", "endorsements")
SELECT ps."profileId", s."canonicalId", SUM(ps."endorsements")
FROM "ProfileSkill" ps
JOIN "Skill" s ON s."id" = ps."skillId"
WHERE s."canonicalId" IS NOT NULL
GROUP BY ps."profileId", s."canonicalId"
ON CONFLICT ("profileId", "skillId")
DO UPDATE SET "endorsements" = "ProfileSkill"."endorsements" + EXCLUDED."endorsements";
