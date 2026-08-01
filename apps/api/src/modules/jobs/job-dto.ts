// Row shape and DTO mapper for jobs, split out of jobs.service.ts when the
// governorate facet pushed that file past the 300-LOC gate. Nothing here is
// query logic — it is the shape the include produces and the wire form.

import type { Job as JobDto } from "@baydar/shared";

export interface JobRow {
  id: string;
  companyId: string | null;
  postedById: string;
  occupationKey: string | null;
  minStanding: number | null;
  requiresLicence: boolean;
  licenceBodyKey: string | null;
  payBasis: JobDto["payBasis"];
  mustSkills: string[];
  startsAt: Date | null;
  durationDays: number | null;
  title: string;
  description: string;
  type: JobDto["type"];
  locationMode: JobDto["locationMode"];
  city: string | null;
  country: string;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  skillsRequired: string[];
  isActive: boolean;
  expiresAt: Date | null;
  createdAt: Date;
  company: {
    id: string;
    slug: string;
    name: string;
    logoUrl: string | null;
  } | null;
  postedBy: {
    profile: {
      handle: string;
      firstName: string;
      lastName: string;
      avatarUrl: string | null;
    } | null;
  };
  applications: { id: string }[];
  bookmarks: { id: string }[];
}

export function toJobDto(row: JobRow): JobDto {
  return {
    id: row.id,
    companyId: row.companyId,
    postedById: row.postedById,
    occupationKey: row.occupationKey,
    minStanding: row.minStanding,
    requiresLicence: row.requiresLicence,
    licenceBodyKey: row.licenceBodyKey,
    payBasis: row.payBasis,
    mustSkills: row.mustSkills,
    startsAt: row.startsAt ? row.startsAt.toISOString() : null,
    durationDays: row.durationDays,
    title: row.title,
    description: row.description,
    type: row.type,
    locationMode: row.locationMode,
    city: row.city,
    country: row.country,
    salaryMin: row.salaryMin,
    salaryMax: row.salaryMax,
    salaryCurrency: row.salaryCurrency,
    skillsRequired: row.skillsRequired,
    isActive: row.isActive,
    expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    company: row.company,
    // A job always has a poster; a profile-less user cannot reach the composer,
    // so the empty fallback is defensive rather than expected.
    poster: {
      handle: row.postedBy.profile?.handle ?? "",
      firstName: row.postedBy.profile?.firstName ?? "",
      lastName: row.postedBy.profile?.lastName ?? "",
      avatarUrl: row.postedBy.profile?.avatarUrl ?? null,
    },
    viewer: {
      hasApplied: row.applications.length > 0,
      bookmarkId: row.bookmarks[0]?.id ?? null,
    },
  };
}
