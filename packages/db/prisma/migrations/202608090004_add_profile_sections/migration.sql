-- The profile sections a CV has and Baydar did not.
--
-- New tables only. None of them is evidence on its own — a certificate is a
-- claim until somebody checks it — which is why none of them feeds the
-- evidence score except through the paths §5.3 names.

CREATE TYPE "LanguageLevel" AS ENUM ('BASIC', 'CONVERSATIONAL', 'PROFESSIONAL', 'NATIVE');

CREATE TABLE "Certificate" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "issuerName" TEXT NOT NULL,
    "issuerKey" TEXT,
    "credentialId" TEXT,
    "credentialUrl" TEXT,
    "issuedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Certificate_profileId_idx" ON "Certificate"("profileId");
CREATE INDEX "Certificate_issuerKey_idx" ON "Certificate"("issuerKey");
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_profileId_fkey"
    FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ProfileLanguage" (
    "profileId" TEXT NOT NULL,
    "languageKey" TEXT NOT NULL,
    "proficiency" "LanguageLevel" NOT NULL,

    CONSTRAINT "ProfileLanguage_pkey" PRIMARY KEY ("profileId", "languageKey")
);
ALTER TABLE "ProfileLanguage" ADD CONSTRAINT "ProfileLanguage_profileId_fkey"
    FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "VolunteerRole" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "organisation" TEXT NOT NULL,
    "causeKey" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VolunteerRole_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "VolunteerRole_profileId_idx" ON "VolunteerRole"("profileId");
ALTER TABLE "VolunteerRole" ADD CONSTRAINT "VolunteerRole_profileId_fkey"
    FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Honor" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "issuerName" TEXT NOT NULL,
    "awardedAt" TIMESTAMP(3),
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Honor_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Honor_profileId_idx" ON "Honor"("profileId");
ALTER TABLE "Honor" ADD CONSTRAINT "Honor_profileId_fkey"
    FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Publication" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "venue" TEXT,
    "url" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Publication_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Publication_profileId_idx" ON "Publication"("profileId");
ALTER TABLE "Publication" ADD CONSTRAINT "Publication_profileId_fkey"
    FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- The diaspora needs an English profile; the local market needs Arabic. The
-- member writes both — a machine-translated headline in a hiring context is
-- worse than none.
CREATE TABLE "ProfileTranslation" (
    "profileId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "headline" TEXT,
    "about" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfileTranslation_pkey" PRIMARY KEY ("profileId", "locale")
);
ALTER TABLE "ProfileTranslation" ADD CONSTRAINT "ProfileTranslation_profileId_fkey"
    FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
