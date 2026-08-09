import type {
  Certificate,
  Honor,
  ProfileLanguage,
  ProfileTranslation,
  Publication,
  VolunteerRole,
} from "@baydar/shared";

// The seven sections a professional life has that jobs-and-schools does not
// cover. Kept out of profiles.mapper.ts because that file describes the core
// row, and one mapper carrying twelve relations is a file nobody reads.

/** Rows as Prisma returns them, hand-rolled — the api package does not compile
 *  against the generated client types. Same reasoning as ProfileWithIncludes. */
export interface ProfileSectionRows {
  certificates: Array<{
    id: string;
    name: string;
    issuerName: string;
    issuerKey: string | null;
    credentialId: string | null;
    credentialUrl: string | null;
    issuedAt: Date | null;
    expiresAt: Date | null;
  }>;
  languages: Array<{ languageKey: string; proficiency: ProfileLanguage["proficiency"] }>;
  volunteerRoles: Array<{
    id: string;
    role: string;
    organisation: string;
    causeKey: string | null;
    startDate: Date;
    endDate: Date | null;
    description: string | null;
  }>;
  honors: Array<{
    id: string;
    title: string;
    issuerName: string;
    awardedAt: Date | null;
    description: string | null;
  }>;
  publications: Array<{
    id: string;
    title: string;
    venue: string | null;
    url: string | null;
    publishedAt: Date | null;
  }>;
  translations: Array<{
    locale: string;
    firstName: string;
    lastName: string;
    headline: string | null;
    about: string | null;
  }>;
}

/**
 * Ordering is part of the contract.
 *
 * A CV reads newest-first everywhere, and a client that has to sort seven
 * arrays before rendering will sort six of them.
 */
export const profileSectionInclude = {
  certificates: { orderBy: { issuedAt: "desc" as const } },
  languages: true,
  volunteerRoles: { orderBy: { startDate: "desc" as const } },
  honors: { orderBy: { awardedAt: "desc" as const } },
  publications: { orderBy: { publishedAt: "desc" as const } },
  translations: true,
} as const;

const iso = (d: Date | null): string | null => (d ? d.toISOString() : null);

export function toCertificateDto(row: ProfileSectionRows["certificates"][number]): Certificate {
  return {
    id: row.id,
    name: row.name,
    issuerName: row.issuerName,
    issuerKey: row.issuerKey,
    credentialId: row.credentialId,
    credentialUrl: row.credentialUrl,
    issuedAt: iso(row.issuedAt),
    expiresAt: iso(row.expiresAt),
  };
}

export function toVolunteerRoleDto(
  row: ProfileSectionRows["volunteerRoles"][number],
): VolunteerRole {
  return {
    id: row.id,
    role: row.role,
    organisation: row.organisation,
    // Cast rather than validate: the column is written only through
    // `VolunteerCauseKey`, and re-parsing every row on every read to catch a
    // value only a migration could introduce is work nobody benefits from.
    causeKey: row.causeKey as VolunteerRole["causeKey"],
    startDate: row.startDate.toISOString(),
    endDate: iso(row.endDate),
    description: row.description,
  };
}

export function toHonorDto(row: ProfileSectionRows["honors"][number]): Honor {
  return {
    id: row.id,
    title: row.title,
    issuerName: row.issuerName,
    awardedAt: iso(row.awardedAt),
    description: row.description,
  };
}

export function toPublicationDto(row: ProfileSectionRows["publications"][number]): Publication {
  return {
    id: row.id,
    title: row.title,
    venue: row.venue,
    url: row.url,
    publishedAt: iso(row.publishedAt),
  };
}

export function toTranslationDto(
  row: ProfileSectionRows["translations"][number],
): ProfileTranslation {
  return {
    locale: row.locale as ProfileTranslation["locale"],
    firstName: row.firstName,
    lastName: row.lastName,
    headline: row.headline,
    about: row.about,
  };
}

export function toSectionDtos(rows: ProfileSectionRows): {
  certificates: Certificate[];
  languages: ProfileLanguage[];
  volunteerRoles: VolunteerRole[];
  honors: Honor[];
  publications: Publication[];
  translations: ProfileTranslation[];
} {
  return {
    certificates: rows.certificates.map(toCertificateDto),
    languages: rows.languages.map((l) => ({
      languageKey: l.languageKey,
      proficiency: l.proficiency,
    })),
    volunteerRoles: rows.volunteerRoles.map(toVolunteerRoleDto),
    honors: rows.honors.map(toHonorDto),
    publications: rows.publications.map(toPublicationDto),
    translations: rows.translations.map(toTranslationDto),
  };
}
