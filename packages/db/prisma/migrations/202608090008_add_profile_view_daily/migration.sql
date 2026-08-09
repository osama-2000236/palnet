-- Who looked at my profile, counted rather than named.
--
-- Aggregate rows, not per-view rows: at this scale a view table is a privacy
-- liability and an index-bloat problem, and named viewers are never sold here.
-- The breakdowns are k-anonymised at read time (k = 5), so a member with three
-- viewers learns nothing about which three.

CREATE TABLE "ProfileViewDaily" (
    "profileId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "byOccupation" JSONB,
    "byGovernorate" JSONB,

    CONSTRAINT "ProfileViewDaily_pkey" PRIMARY KEY ("profileId", "day")
);
CREATE INDEX "ProfileViewDaily_day_idx" ON "ProfileViewDaily"("day");
ALTER TABLE "ProfileViewDaily" ADD CONSTRAINT "ProfileViewDaily_profileId_fkey"
    FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- A negative view count is a bug that would otherwise render.
ALTER TABLE "ProfileViewDaily" ADD CONSTRAINT "ProfileViewDaily_views_not_negative"
    CHECK ("views" >= 0);
