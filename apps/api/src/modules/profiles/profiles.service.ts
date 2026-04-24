import { Injectable } from "@nestjs/common";
import {
  type AddSkillBody,
  type EducationBody,
  ErrorCode,
  type ExperienceBody,
  type OnboardProfileBody,
  type Profile as ProfileDto,
  type UpdateProfileBody,
} from "@palnet/shared";

import { DomainException } from "../../common/domain-exception";
import { PrismaService } from "../prisma/prisma.service";

import { profileInclude, toProfileDto } from "./profiles.mapper";

@Injectable()
export class ProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  async onboard(userId: string, body: OnboardProfileBody): Promise<ProfileDto> {
    const existing = await this.prisma.profile.findUnique({
      where: { userId },
    });

    // Handle collision check — if another profile owns the desired handle, 409.
    const handleOwner = await this.prisma.profile.findUnique({
      where: { handle: body.handle },
    });
    if (handleOwner && handleOwner.userId !== userId) {
      throw new DomainException(
        ErrorCode.CONFLICT,
        "Handle is already taken.",
        409,
      );
    }

    const data = {
      handle: body.handle,
      firstName: body.firstName,
      lastName: body.lastName,
      headline: body.headline,
      location: body.location,
      country: body.country,
    };

    const profile = existing
      ? await this.prisma.profile.update({
          where: { userId },
          data,
          include: profileInclude,
        })
      : await this.prisma.profile.create({
          data: { ...data, userId },
          include: profileInclude,
        });

    return toProfileDto(profile, { isSelf: true, connection: null });
  }

  async updateMine(
    userId: string,
    body: UpdateProfileBody,
  ): Promise<ProfileDto> {
    if (body.handle) {
      const handleOwner = await this.prisma.profile.findUnique({
        where: { handle: body.handle },
      });
      if (handleOwner && handleOwner.userId !== userId) {
        throw new DomainException(
          ErrorCode.CONFLICT,
          "Handle is already taken.",
          409,
        );
      }
    }
    try {
      const row = await this.prisma.profile.update({
        where: { userId },
        data: body,
        include: profileInclude,
      });
      return toProfileDto(row, { isSelf: true, connection: null });
    } catch {
      throw new DomainException(ErrorCode.NOT_FOUND, "Profile not found.", 404);
    }
  }

  async getByHandle(
    handle: string,
    viewerId?: string,
  ): Promise<ProfileDto> {
    const profile = await this.prisma.profile.findUnique({
      where: { handle },
      include: profileInclude,
    });
    if (!profile) {
      throw new DomainException(ErrorCode.NOT_FOUND, "Profile not found.", 404);
    }

    const viewer = await this.viewerState(viewerId, profile.userId);
    return toProfileDto(profile, viewer);
  }

  async getMine(userId: string): Promise<ProfileDto> {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      include: profileInclude,
    });
    if (!profile) {
      throw new DomainException(ErrorCode.NOT_FOUND, "Profile not found.", 404);
    }
    return toProfileDto(profile, { isSelf: true, connection: null });
  }

  // ────────────────────────────────────────────────────────────────────
  // Experiences
  // ────────────────────────────────────────────────────────────────────

  async addExperience(
    userId: string,
    body: ExperienceBody,
  ): Promise<ProfileDto> {
    const profile = await this.requireProfile(userId);
    await this.prisma.experience.create({
      data: {
        profileId: profile.id,
        title: body.title,
        companyName: body.companyName,
        companyId: body.companyId ?? null,
        location: body.location ?? null,
        locationMode: body.locationMode,
        startDate: new Date(body.startDate),
        endDate: body.endDate ? new Date(body.endDate) : null,
        description: body.description ?? null,
      },
    });
    return this.getMine(userId);
  }

  async updateExperience(
    userId: string,
    experienceId: string,
    body: ExperienceBody,
  ): Promise<ProfileDto> {
    const profile = await this.requireProfile(userId);
    const existing = await this.prisma.experience.findUnique({
      where: { id: experienceId },
    });
    if (!existing || existing.profileId !== profile.id) {
      throw new DomainException(
        ErrorCode.NOT_FOUND,
        "Experience not found.",
        404,
      );
    }
    await this.prisma.experience.update({
      where: { id: experienceId },
      data: {
        title: body.title,
        companyName: body.companyName,
        companyId: body.companyId ?? null,
        location: body.location ?? null,
        locationMode: body.locationMode,
        startDate: new Date(body.startDate),
        endDate: body.endDate ? new Date(body.endDate) : null,
        description: body.description ?? null,
      },
    });
    return this.getMine(userId);
  }

  async deleteExperience(
    userId: string,
    experienceId: string,
  ): Promise<ProfileDto> {
    const profile = await this.requireProfile(userId);
    const existing = await this.prisma.experience.findUnique({
      where: { id: experienceId },
    });
    if (!existing || existing.profileId !== profile.id) {
      throw new DomainException(
        ErrorCode.NOT_FOUND,
        "Experience not found.",
        404,
      );
    }
    await this.prisma.experience.delete({ where: { id: experienceId } });
    return this.getMine(userId);
  }

  // ────────────────────────────────────────────────────────────────────
  // Educations
  // ────────────────────────────────────────────────────────────────────

  async addEducation(
    userId: string,
    body: EducationBody,
  ): Promise<ProfileDto> {
    const profile = await this.requireProfile(userId);
    await this.prisma.education.create({
      data: {
        profileId: profile.id,
        school: body.school,
        degree: body.degree ?? null,
        fieldOfStudy: body.fieldOfStudy ?? null,
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
        description: body.description ?? null,
      },
    });
    return this.getMine(userId);
  }

  async updateEducation(
    userId: string,
    educationId: string,
    body: EducationBody,
  ): Promise<ProfileDto> {
    const profile = await this.requireProfile(userId);
    const existing = await this.prisma.education.findUnique({
      where: { id: educationId },
    });
    if (!existing || existing.profileId !== profile.id) {
      throw new DomainException(
        ErrorCode.NOT_FOUND,
        "Education not found.",
        404,
      );
    }
    await this.prisma.education.update({
      where: { id: educationId },
      data: {
        school: body.school,
        degree: body.degree ?? null,
        fieldOfStudy: body.fieldOfStudy ?? null,
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
        description: body.description ?? null,
      },
    });
    return this.getMine(userId);
  }

  async deleteEducation(
    userId: string,
    educationId: string,
  ): Promise<ProfileDto> {
    const profile = await this.requireProfile(userId);
    const existing = await this.prisma.education.findUnique({
      where: { id: educationId },
    });
    if (!existing || existing.profileId !== profile.id) {
      throw new DomainException(
        ErrorCode.NOT_FOUND,
        "Education not found.",
        404,
      );
    }
    await this.prisma.education.delete({ where: { id: educationId } });
    return this.getMine(userId);
  }

  // ────────────────────────────────────────────────────────────────────
  // Skills
  // ────────────────────────────────────────────────────────────────────

  async addSkill(userId: string, body: AddSkillBody): Promise<ProfileDto> {
    const profile = await this.requireProfile(userId);
    const name = body.name.trim();
    const slug = slugifySkill(name);

    // Find-or-create the Skill row by slug.
    const skill = await this.prisma.skill.upsert({
      where: { slug },
      create: { name, slug },
      update: {}, // keep the canonical name on first write
    });

    // Associate to profile (idempotent).
    await this.prisma.profileSkill.upsert({
      where: { profileId_skillId: { profileId: profile.id, skillId: skill.id } },
      create: { profileId: profile.id, skillId: skill.id },
      update: {},
    });
    return this.getMine(userId);
  }

  async removeSkill(userId: string, skillId: string): Promise<ProfileDto> {
    const profile = await this.requireProfile(userId);
    await this.prisma.profileSkill.deleteMany({
      where: { profileId: profile.id, skillId },
    });
    return this.getMine(userId);
  }

  // ────────────────────────────────────────────────────────────────────
  // Internals
  // ────────────────────────────────────────────────────────────────────

  private async requireProfile(userId: string): Promise<{ id: string }> {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!profile) {
      throw new DomainException(ErrorCode.NOT_FOUND, "Profile not found.", 404);
    }
    return profile;
  }

  private async viewerState(
    viewerId: string | undefined,
    targetUserId: string,
  ): Promise<ProfileDto["viewer"]> {
    if (!viewerId) return undefined;
    if (viewerId === targetUserId) {
      return { isSelf: true, connection: null };
    }
    const row = await this.prisma.connection.findFirst({
      where: {
        OR: [
          { requesterId: viewerId, receiverId: targetUserId },
          { requesterId: targetUserId, receiverId: viewerId },
        ],
      },
      orderBy: { updatedAt: "desc" },
    });
    if (!row) return { isSelf: false, connection: null };
    const direction = row.requesterId === viewerId ? "OUTGOING" : "INCOMING";
    return {
      isSelf: false,
      connection: {
        status: row.status,
        direction,
        connectionId: row.id,
      },
    };
  }
}

// Lower-case, dash-joined, ascii-only slug. Arabic names pass through unchanged
// and retain uniqueness via the Unicode range; dash-collapsing keeps them tidy.
function slugifySkill(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
