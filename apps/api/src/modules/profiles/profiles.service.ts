import { Injectable } from "@nestjs/common";
import { ErrorCode, type OnboardProfileBody } from "@palnet/shared";

import { DomainException } from "../../common/domain-exception";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  async onboard(userId: string, body: OnboardProfileBody) {
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
      ? await this.prisma.profile.update({ where: { userId }, data })
      : await this.prisma.profile.create({ data: { ...data, userId } });

    return profile;
  }

  async getByHandle(handle: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { handle },
      include: {
        experiences: { orderBy: { startDate: "desc" } },
        educations: { orderBy: { startDate: "desc" } },
        skills: { include: { skill: true } },
      },
    });
    if (!profile) {
      throw new DomainException(ErrorCode.NOT_FOUND, "Profile not found.", 404);
    }
    return profile;
  }

  async getMine(userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      include: {
        experiences: { orderBy: { startDate: "desc" } },
        educations: { orderBy: { startDate: "desc" } },
        skills: { include: { skill: true } },
      },
    });
    if (!profile) {
      throw new DomainException(
        ErrorCode.NOT_FOUND,
        "Profile not found.",
        404,
      );
    }
    return profile;
  }
}
