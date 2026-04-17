import { Injectable } from "@nestjs/common";
import {
  ErrorCode,
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
  // Internals
  // ────────────────────────────────────────────────────────────────────

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
