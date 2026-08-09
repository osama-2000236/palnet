-- A named person putting their own reputation behind somebody.
--
-- In a market where 41.3% of graduates are unemployed and everyone has a CV,
-- self-reported history has almost no discriminating power. This is one of the
-- three things that does.

CREATE TYPE "RecommendationRelation" AS ENUM (
    'MANAGED_DIRECTLY', 'REPORTED_TO_ME', 'SAME_TEAM', 'DIFFERENT_TEAM',
    'CLIENT_OF', 'SUPPLIER_TO', 'TAUGHT', 'STUDIED_UNDER'
);
CREATE TYPE "RecommendationStatus" AS ENUM ('PENDING', 'PUBLISHED', 'DECLINED', 'WITHDRAWN');

CREATE TABLE "Recommendation" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "relationship" "RecommendationRelation" NOT NULL,
    -- "" means "about them generally", not "unknown". NOT NULL is load-bearing:
    -- this column is in the unique index below, Postgres treats NULLs as
    -- distinct, and a nullable version would silently allow one author to
    -- publish unlimited general testimonials about the same person.
    "occupationKey" TEXT NOT NULL DEFAULT '',
    "body" TEXT NOT NULL,
    "status" "RecommendationStatus" NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),
    "hiddenBySubject" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Recommendation_pkey" PRIMARY KEY ("id")
);

-- One per (author, subject, occupation). A second testimonial from the same
-- person about the same work is not more evidence.
CREATE UNIQUE INDEX "Recommendation_authorId_subjectId_occupationKey_key"
    ON "Recommendation"("authorId", "subjectId", "occupationKey");
-- The profile read: published, not hidden, for this subject.
CREATE INDEX "Recommendation_subjectId_status_hiddenBySubject_idx"
    ON "Recommendation"("subjectId", "status", "hiddenBySubject");
CREATE INDEX "Recommendation_authorId_idx" ON "Recommendation"("authorId");

ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_subjectId_fkey"
    FOREIGN KEY ("subjectId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Nobody recommends themselves.
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_not_self"
    CHECK ("authorId" <> "subjectId");
