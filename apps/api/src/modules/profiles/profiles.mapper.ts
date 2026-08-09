import type { AddressGender, CareerBreakReason, Profile as ProfileDto } from "@baydar/shared";

import {
  profileSectionInclude,
  toSectionDtos,
  type ProfileSectionRows,
} from "./profile-sections.mapper";

// Shape returned by `prisma.profile.findUnique({ include: profileInclude })`.
// Hand-rolled so the api package doesn't need @prisma/client's generated types
// at compile time (the db package owns the generator).
export interface ProfileWithIncludes {
  id: string;
  userId: string;
  handle: string;
  firstName: string;
  lastName: string;
  headline: string | null;
  about: string | null;
  location: string | null;
  country: string;
  residenceCountry: string;
  originGovernorate: string | null;
  diasporaVisible: boolean;
  addressGender: AddressGender | null;
  careerBreakFrom: Date | null;
  careerBreakTo: Date | null;
  careerBreakReason: CareerBreakReason | null;
  evidenceScore: number;
  avatarUrl: string | null;
  coverUrl: string | null;
  website: string | null;
  pronouns: string | null;
  openToWork: boolean;
  hiring: boolean;
  experiences: Array<{
    id: string;
    title: string;
    companyName: string;
    companyId: string | null;
    location: string | null;
    locationMode: "ONSITE" | "HYBRID" | "REMOTE";
    startDate: Date;
    endDate: Date | null;
    description: string | null;
  }>;
  educations: Array<{
    id: string;
    school: string;
    degree: string | null;
    fieldOfStudy: string | null;
    startDate: Date | null;
    endDate: Date | null;
    description: string | null;
  }>;
  skills: Array<{
    endorsements: number;
    skill: { id: string; name: string; slug: string };
  }>;
}

export interface ProfileWithSections extends ProfileWithIncludes, ProfileSectionRows {}

export const profileInclude = {
  experiences: { orderBy: { startDate: "desc" as const } },
  educations: { orderBy: { startDate: "desc" as const } },
  skills: { include: { skill: true } },
  ...profileSectionInclude,
} as const;

export function toProfileDto(row: ProfileWithSections, viewer?: ProfileDto["viewer"]): ProfileDto {
  return {
    id: row.id,
    userId: row.userId,
    handle: row.handle,
    firstName: row.firstName,
    lastName: row.lastName,
    headline: row.headline,
    about: row.about,
    location: row.location,
    country: row.country,
    residenceCountry: row.residenceCountry,
    originGovernorate: row.originGovernorate,
    diasporaVisible: row.diasporaVisible,
    addressGender: row.addressGender,
    evidenceScore: row.evidenceScore,
    // A break with no start date is not a break, it is a half-filled form, so
    // `from` is what decides whether the section exists at all.
    careerBreak: row.careerBreakFrom
      ? {
          from: row.careerBreakFrom.toISOString(),
          to: row.careerBreakTo ? row.careerBreakTo.toISOString() : null,
          reason: row.careerBreakReason ?? "CAREER_BREAK_OTHER",
        }
      : null,
    avatarUrl: row.avatarUrl,
    coverUrl: row.coverUrl,
    website: row.website,
    pronouns: row.pronouns,
    openToWork: row.openToWork,
    hiring: row.hiring,
    experiences: row.experiences.map((e) => ({
      id: e.id,
      title: e.title,
      companyName: e.companyName,
      companyId: e.companyId,
      location: e.location,
      locationMode: e.locationMode,
      startDate: e.startDate.toISOString(),
      endDate: e.endDate ? e.endDate.toISOString() : null,
      description: e.description,
    })),
    educations: row.educations.map((e) => ({
      id: e.id,
      school: e.school,
      degree: e.degree,
      fieldOfStudy: e.fieldOfStudy,
      startDate: e.startDate ? e.startDate.toISOString() : null,
      endDate: e.endDate ? e.endDate.toISOString() : null,
      description: e.description,
    })),
    skills: row.skills.map((s) => ({
      id: s.skill.id,
      name: s.skill.name,
      slug: s.skill.slug,
      endorsements: s.endorsements,
    })),
    ...toSectionDtos(row),
    viewer,
  };
}
