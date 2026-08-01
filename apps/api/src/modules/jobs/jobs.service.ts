import { Prisma } from "@baydar/db";
import {
  ApplicationStatus,
  type ApplyToJobBody,
  type CursorPageMeta,
  ErrorCode,
  type Job as JobDto,
  PS_GOVERNORATES,
  type PublicJob as PublicJobDto,
  takePage,
} from "@baydar/shared";
import { Injectable } from "@nestjs/common";

import { DomainException } from "../../common/domain-exception";
import { PrismaService } from "../prisma/prisma.service";

import { toJobDto, type JobRow } from "./job-dto";

const jobInclude = (viewerId: string) =>
  ({
    company: { select: { id: true, slug: true, name: true, logoUrl: true } },
    postedBy: {
      select: {
        profile: { select: { handle: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    },
    applications: {
      where: { applicantId: viewerId },
      select: { id: true },
      take: 1,
    },
    bookmarks: {
      where: { userId: viewerId },
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
      companyId?: string | null;
      industry?: string | null;
      governorate?: string | null;
    },
  ): Promise<{ data: JobDto[]; meta: CursorPageMeta }> {
    // Governorate facet, derived from PS_GOVERNORATES rather than a stored
    // column: CreateJobBody normalizes `city` to the canonical name, so the
    // governorate is just an IN over the city names it contains. A diaspora or
    // free-text city matches nothing here rather than matching the wrong
    // governorate — the degradation rule palestine.ts states.
    const governorateCities = filters.governorate
      ? (PS_GOVERNORATES.find((g) => g.key === filters.governorate)?.cities ?? []).flatMap((c) => [
          c.ar,
          c.en,
        ])
      : null;

    // Folded substring prefilter: baydar_fold (SQL twin of shared foldArabic)
    // makes احمد match أحمد etc.; ILIKE covers Latin case. Substring semantics
    // kept on purpose — this is the jobs page filter-as-you-type box, not the
    // word-level FTS in search.service.ts.
    // ponytail: seq scan at beta scale; move to the folded FTS GIN index if
    // the jobs table ever gets big.
    let qIds: string[] | null = null;
    if (filters.q) {
      const pattern = filters.q.replace(/[\\%_]/g, (m) => `\\${m}`);
      const rows = await this.prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
        SELECT "id"
        FROM   "Job"
        WHERE  "isActive"  = TRUE
          AND  "deletedAt" IS NULL
          AND  baydar_fold(COALESCE("title", '') || ' ' || COALESCE("description", ''))
               ILIKE '%' || baydar_fold(${pattern}) || '%'
      `);
      qIds = rows.map((r) => r.id);
      if (qIds.length === 0) {
        return { data: [], meta: { nextCursor: null, hasMore: false, limit } };
      }
    }

    const rows = (await this.prisma.job.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        ...(filters.companyId ? { companyId: filters.companyId } : {}),
        ...(qIds ? { id: { in: qIds } } : {}),
        ...(filters.city ? { city: { contains: filters.city, mode: "insensitive" } } : {}),
        // AND, not another `city` key — a second one would silently overwrite
        // the contains filter above when both facets are set.
        ...(governorateCities ? { AND: [{ city: { in: governorateCities } }] } : {}),
        ...(filters.type ? { type: filters.type } : {}),
        ...(filters.locationMode ? { locationMode: filters.locationMode } : {}),
        // Sector facet over the company's free-text industry. Filter chips and
        // the company form both write canonical PS_INDUSTRIES Arabic values, so
        // contains-insensitive is enough; fold like q if legacy variants show up.
        ...(filters.industry
          ? { company: { industry: { contains: filters.industry, mode: "insensitive" } } }
          : {}),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: jobInclude(viewerId),
    })) as unknown as JobRow[];

    const { rows: page, meta } = takePage(rows, limit);
    return { data: page.map(toJobDto), meta };
  }

  // Anonymous share-page read: no viewer fields, so the response is safe to
  // cache publicly. Inactive jobs still resolve — the share page renders a
  // "no longer available" state instead of a dead link.
  async getPublic(id: string): Promise<PublicJobDto> {
    const row = await this.prisma.job.findFirst({
      where: { id, deletedAt: null },
      include: {
        company: { select: { id: true, slug: true, name: true, logoUrl: true } },
        postedBy: {
          select: {
            profile: { select: { handle: true, firstName: true, lastName: true, avatarUrl: true } },
          },
        },
      },
    });
    if (!row) {
      throw new DomainException(ErrorCode.NOT_FOUND, "Job not found.", 404);
    }
    return {
      id: row.id,
      companyId: row.companyId,
      title: row.title,
      description: row.description,
      type: row.type as PublicJobDto["type"],
      locationMode: row.locationMode as PublicJobDto["locationMode"],
      city: row.city,
      country: row.country,
      occupationKey: row.occupationKey,
      minStanding: row.minStanding,
      requiresLicence: row.requiresLicence,
      licenceBodyKey: row.licenceBodyKey,
      payBasis: row.payBasis as PublicJobDto["payBasis"],
      mustSkills: row.mustSkills,
      startsAt: row.startsAt ? row.startsAt.toISOString() : null,
      durationDays: row.durationDays,
      salaryMin: row.salaryMin,
      salaryMax: row.salaryMax,
      salaryCurrency: row.salaryCurrency,
      skillsRequired: row.skillsRequired,
      isActive: row.isActive,
      poster: {
        handle: row.postedBy.profile?.handle ?? "",
        firstName: row.postedBy.profile?.firstName ?? "",
        lastName: row.postedBy.profile?.lastName ?? "",
        avatarUrl: row.postedBy.profile?.avatarUrl ?? null,
      },
      expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
      createdAt: row.createdAt.toISOString(),
      company: row.company,
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

    try {
      return await this.prisma.application.create({
        data: {
          jobId: id,
          applicantId: viewerId,
          resumeUrl: body.resumeUrl ?? null,
          coverLetter: body.coverLetter ?? null,
        },
        select: { id: true, status: true },
      });
    } catch (err) {
      // Concurrent duplicate apply lost the race to the unique constraint
      // (P2002) — still idempotent: return the row the winner created.
      if (isUniqueViolation(err)) {
        return this.prisma.application.findUniqueOrThrow({
          where: { jobId_applicantId: { jobId: id, applicantId: viewerId } },
          select: { id: true, status: true },
        });
      }
      throw err;
    }
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" && error !== null && (error as { code?: unknown }).code === "P2002"
  );
}
