import { Injectable } from "@nestjs/common";
import {
  type Application,
  type CursorPageMeta,
  type UpdateApplicationStatusBody,
  ErrorCode,
  NotificationType,
} from "@palnet/shared";

import { DomainException } from "../../common/domain-exception";
import type { AuthUser } from "../auth/decorators/current-user.decorator";
import { CompaniesService } from "../companies/companies.service";
import { toApplicationDto } from "../jobs/jobs.mapper";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";

type ApplicationRow = {
  id: string;
  status: Application["status"];
  resumeUrl: string | null;
  coverLetter: string | null;
  createdAt: Date;
  updatedAt: Date;
  applicant: {
    id: string;
    profile: {
      handle: string;
      firstName: string;
      lastName: string;
      headline: string | null;
      avatarUrl: string | null;
    } | null;
  };
  job: {
    id: string;
    title: string;
    type: Application["job"]["type"];
    locationMode: Application["job"]["locationMode"];
    city: string | null;
    companyId: string;
    company: {
      id: string;
      slug: string;
      name: string;
      tagline: string | null;
      logoUrl: string | null;
      logoBlur: string | null;
      city: string | null;
      country: string;
      members: { role: "OWNER" | "ADMIN" | "EDITOR" }[];
    };
  };
};

const applicationInclude = (viewerId: string) =>
  ({
    applicant: {
      select: {
        id: true,
        profile: {
          select: {
            handle: true,
            firstName: true,
            lastName: true,
            headline: true,
            avatarUrl: true,
          },
        },
      },
    },
    job: {
      select: {
        id: true,
        title: true,
        type: true,
        locationMode: true,
        city: true,
        companyId: true,
        company: {
          select: {
            id: true,
            slug: true,
            name: true,
            tagline: true,
            logoUrl: true,
            logoBlur: true,
            city: true,
            country: true,
            members: {
              where: { userId: viewerId },
              select: { role: true },
              take: 1,
            },
          },
        },
      },
    },
  }) as const;

@Injectable()
export class ApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly companies: CompaniesService,
    private readonly notifications: NotificationsService,
  ) {}

  async listMine(
    viewer: AuthUser,
    cursor: string | null,
    limit: number,
  ): Promise<{ data: Application[]; meta: CursorPageMeta }> {
    const rows = (await this.prisma.application.findMany({
      where: { applicantId: viewer.id },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: applicationInclude(viewer.id),
    })) as unknown as ApplicationRow[];

    const hasMore = rows.length > limit;
    const trimmed = hasMore ? rows.slice(0, limit) : rows;
    return {
      data: trimmed.map((row) => toApplicationDto(row, false)),
      meta: {
        nextCursor: hasMore ? trimmed[trimmed.length - 1]!.id : null,
        hasMore,
        limit,
      },
    };
  }

  async listForJob(
    viewer: AuthUser,
    companyId: string,
    jobId: string,
    cursor: string | null,
    limit: number,
  ): Promise<{ data: Application[]; meta: CursorPageMeta }> {
    await this.companies.assertCanManage(viewer, companyId, "ANY_EDITOR");

    const job = await this.prisma.job.findFirst({
      where: { id: jobId, companyId, deletedAt: null },
      select: { id: true },
    });
    if (!job) {
      throw new DomainException(ErrorCode.NOT_FOUND, "Job not found.", 404);
    }

    const rows = (await this.prisma.application.findMany({
      where: { jobId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: applicationInclude(viewer.id),
    })) as unknown as ApplicationRow[];

    const hasMore = rows.length > limit;
    const trimmed = hasMore ? rows.slice(0, limit) : rows;
    return {
      data: trimmed.map((row) => toApplicationDto(row, true)),
      meta: {
        nextCursor: hasMore ? trimmed[trimmed.length - 1]!.id : null,
        hasMore,
        limit,
      },
    };
  }

  async updateStatus(
    viewer: AuthUser,
    id: string,
    body: UpdateApplicationStatusBody,
  ): Promise<Application> {
    const existing = (await this.prisma.application.findUnique({
      where: { id },
      include: applicationInclude(viewer.id),
    })) as unknown as ApplicationRow | null;
    if (!existing) {
      throw new DomainException(
        ErrorCode.NOT_FOUND,
        "Application not found.",
        404,
      );
    }

    const role = existing.job.company.members[0]?.role;
    const canManage =
      viewer.role === "ADMIN" ||
      role === "OWNER" ||
      role === "ADMIN" ||
      role === "EDITOR";
    if (!canManage) {
      throw new DomainException(
        ErrorCode.AUTH_FORBIDDEN,
        "You cannot manage this application.",
        403,
      );
    }

    const updated =
      existing.status === body.status
        ? existing
        : ((await this.prisma.application.update({
            where: { id },
            data: { status: body.status },
            include: applicationInclude(viewer.id),
          })) as unknown as ApplicationRow);

    await this.notifications.notify({
      type: NotificationType.JOB_APPLICATION_UPDATE,
      recipientId: updated.applicant.id,
      actorId: viewer.id,
      jobId: updated.job.id,
      data: {
        status: body.status,
        companyId: updated.job.companyId,
        companySlug: updated.job.company.slug,
        companyName: updated.job.company.name,
        jobTitle: updated.job.title,
      },
    });

    return toApplicationDto(updated, true);
  }
}
