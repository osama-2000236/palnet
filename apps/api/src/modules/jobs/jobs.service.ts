import { Injectable } from "@nestjs/common";
import {
  ApplicationStatus,
  type ApplyToJobBody,
  type CursorPageMeta,
  type Job as JobDto,
  type CreateJobBody,
  type UpdateJobBody,
  ErrorCode,
} from "@palnet/shared";

import { DomainException } from "../../common/domain-exception";
import type { AuthUser } from "../auth/decorators/current-user.decorator";
import { CompaniesService } from "../companies/companies.service";
import { PrismaService } from "../prisma/prisma.service";

import { toJobDto } from "./jobs.mapper";

type JobRow = {
  id: string;
  companyId: string;
  postedById: string;
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
    tagline: string | null;
    logoUrl: string | null;
    logoBlur: string | null;
    city: string | null;
    country: string;
    members: { role: "OWNER" | "ADMIN" | "EDITOR" }[];
  };
  applications: { id: string }[];
};

const jobInclude = (viewerId: string) =>
  ({
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
    applications: {
      where: { applicantId: viewerId },
      select: { id: true },
      take: 1,
    },
  }) as const;

@Injectable()
export class JobsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly companies: CompaniesService,
  ) {}

  async list(
    viewer: AuthUser,
    cursor: string | null,
    limit: number,
    filters: {
      q?: string | null;
      city?: string | null;
      type?: JobDto["type"] | null;
      locationMode?: JobDto["locationMode"] | null;
    },
  ): Promise<{ data: JobDto[]; meta: CursorPageMeta }> {
    const rows = (await this.prisma.job.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        ...(filters.q
          ? {
              OR: [
                { title: { contains: filters.q, mode: "insensitive" } },
                { description: { contains: filters.q, mode: "insensitive" } },
              ],
            }
          : {}),
        ...(filters.city
          ? { city: { contains: filters.city, mode: "insensitive" } }
          : {}),
        ...(filters.type ? { type: filters.type } : {}),
        ...(filters.locationMode ? { locationMode: filters.locationMode } : {}),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: jobInclude(viewer.id),
    })) as unknown as JobRow[];

    const hasMore = rows.length > limit;
    const trimmed = hasMore ? rows.slice(0, limit) : rows;
    return {
      data: trimmed.map((row) =>
        toJobDto(row, viewer.role === "ADMIN" || isManageRole(row.company.members[0]?.role)),
      ),
      meta: {
        nextCursor: hasMore ? trimmed[trimmed.length - 1]!.id : null,
        hasMore,
        limit,
      },
    };
  }

  async getOne(viewer: AuthUser, id: string): Promise<JobDto> {
    const row = (await this.prisma.job.findFirst({
      where: { id, deletedAt: null },
      include: jobInclude(viewer.id),
    })) as unknown as JobRow | null;
    if (!row) {
      throw new DomainException(ErrorCode.NOT_FOUND, "Job not found.", 404);
    }

    return toJobDto(
      row,
      viewer.role === "ADMIN" || isManageRole(row.company.members[0]?.role),
    );
  }

  async create(
    viewer: AuthUser,
    companyId: string,
    body: CreateJobBody,
  ): Promise<JobDto> {
    await this.companies.assertCanManage(viewer, companyId, "ANY_EDITOR");

    const created = await this.prisma.job.create({
      data: {
        companyId,
        postedById: viewer.id,
        title: body.title,
        description: body.description,
        type: body.type,
        locationMode: body.locationMode,
        city: body.city ?? null,
        country: body.country,
        salaryMin: body.salaryMin ?? null,
        salaryMax: body.salaryMax ?? null,
        salaryCurrency: body.salaryCurrency ?? null,
        skillsRequired: body.skillsRequired,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      },
      include: jobInclude(viewer.id),
    });

    return toJobDto(created as unknown as JobRow, true);
  }

  async update(
    viewer: AuthUser,
    id: string,
    body: UpdateJobBody,
  ): Promise<JobDto> {
    const job = await this.prisma.job.findUnique({
      where: { id },
      select: { id: true, companyId: true, deletedAt: true },
    });
    if (!job || job.deletedAt) {
      throw new DomainException(ErrorCode.NOT_FOUND, "Job not found.", 404);
    }

    await this.companies.assertCanManage(viewer, job.companyId, "ANY_EDITOR");

    const updated = await this.prisma.job.update({
      where: { id },
      data: {
        title: body.title,
        description: body.description,
        type: body.type,
        locationMode: body.locationMode,
        city: body.city,
        country: body.country,
        salaryMin: body.salaryMin,
        salaryMax: body.salaryMax,
        salaryCurrency: body.salaryCurrency,
        skillsRequired: body.skillsRequired,
        isActive: body.expiresAt === undefined ? undefined : true,
        expiresAt:
          body.expiresAt === undefined
            ? undefined
            : body.expiresAt
              ? new Date(body.expiresAt)
              : null,
      },
      include: jobInclude(viewer.id),
    });

    return toJobDto(updated as unknown as JobRow, true);
  }

  async remove(viewer: AuthUser, id: string): Promise<JobDto> {
    const job = await this.prisma.job.findUnique({
      where: { id },
      select: { id: true, companyId: true, deletedAt: true },
    });
    if (!job || job.deletedAt) {
      throw new DomainException(ErrorCode.NOT_FOUND, "Job not found.", 404);
    }

    await this.companies.assertCanManage(viewer, job.companyId, "ANY_EDITOR");

    const removed = await this.prisma.job.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
      },
      include: jobInclude(viewer.id),
    });

    return toJobDto(removed as unknown as JobRow, true);
  }

  async apply(
    viewerId: string,
    id: string,
    body: ApplyToJobBody,
  ): Promise<{ id: string; status: ApplicationStatus }> {
    const job = await this.prisma.job.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, isActive: true },
    });
    if (!job) {
      throw new DomainException(ErrorCode.NOT_FOUND, "Job not found.", 404);
    }
    if (!job.isActive) {
      throw new DomainException(ErrorCode.JOB_CLOSED, "Job is closed.", 410);
    }

    const existing = await this.prisma.application.findUnique({
      where: { jobId_applicantId: { jobId: id, applicantId: viewerId } },
      select: { id: true, status: true },
    });
    if (existing) return existing;

    const created = await this.prisma.application.create({
      data: {
        jobId: id,
        applicantId: viewerId,
        resumeUrl: body.resumeUrl ?? null,
        coverLetter: body.coverLetter ?? null,
      },
      select: { id: true, status: true },
    });
    return created;
  }
}

function isManageRole(role: string | undefined): boolean {
  return role === "OWNER" || role === "ADMIN";
}
