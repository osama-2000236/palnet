import type { Profile as ProfileDto } from "@palnet/shared";

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
  avatarUrl: string | null;
  avatarBlur: string | null;
  coverUrl: string | null;
  coverBlur: string | null;
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

export const profileInclude = {
  experiences: { orderBy: { startDate: "desc" as const } },
  educations: { orderBy: { startDate: "desc" as const } },
  skills: { include: { skill: true } },
} as const;

export function toProfileDto(
  row: ProfileWithIncludes,
  viewer?: ProfileDto["viewer"],
): ProfileDto {
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
    avatarUrl: row.avatarUrl,
    avatarBlur: row.avatarBlur,
    coverUrl: row.coverUrl,
    coverBlur: row.coverBlur,
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
    viewer,
  };
}
