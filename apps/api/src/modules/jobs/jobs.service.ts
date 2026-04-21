import { Injectable } from "@nestjs/common";
import {
  ApplicationStatus,
  type ApplyToJobBody,
  type CursorPageMeta,
  ErrorCode,
  type Job as JobDto,
} from "@palnet/shared";

import { DomainException } from "../../common/domain-exception";
import { PrismaService } from "../prisma/prisma.service";

interface JobRow {
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
    logoUrl: string | null;
  };
  applications: { id: string }[];
}

const jobInclude = (viewerId: string) =>
  ({
    company: { select: { id: true, slug: true, name: true, logoUrl: true } },
    applications: {
      where: { applicantId: viewerId },
      select: { id: true },
      take: 1,
    },
  }) as const;

@Injectable()
export class JobsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    viewerId: string,
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
      include: jobInclude(viewerId),
    })) as unknown as JobRow[];

    const hasMore = rows.length > limit;
    const trimmed = hasMore ? rows.slice(0, limit) : rows;
    return {
      data: trimmed.map(toJobDto),
      meta: {
        nextCursor: hasMore ? trimmed[trimmed.length - 1]!.id : null,
        hasMore,
        limit,
      },
    };
  }

  async getOne(viewerId: string, id: string): Promise<JobDto> {
    const row = (await this.prisma.job.findFirst({
      where: { id, deletedAt: null },
      include: jobInclude(viewerId),
    })) as unknown as JobRow | null;
    if (!row) {
      throw new DomainException(ErrorCode.NOT_FOUND, "Job not found.", 404);
    }
    return toJobDto(row);
  }

  async apply(
    viewerId: string,
    id: string,
    body: ApplyToJobBody,
  ): Promise<{ id: string; status: ApplicationStatus }> {
    const job = await this.prisma.job.findFirst({
      where: { id, deletedAt: null, isActive: true },
      select: { id: true },
    });
    if (!job) {
      throw new DomainException(ErrorCode.NOT_FOUND, "Job not found.", 404);
    }

    // Idempotent: (jobId, applicantId) is @@unique, so re-apply returns the
    // existing row instead of 409ing the client.
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

function toJobDto(row: JobRow): JobDto {
  return {
    id: row.id,
    companyId: row.companyId,
    postedById: row.postedById,
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
    viewer: { hasApplied: row.applications.length > 0 },
  };
}
