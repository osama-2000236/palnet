import {
  type AddCompanyMemberBody,
  ApplicationStatus,
  type CompanyMember as CompanyMemberDto,
  type CompanySummary,
  type Company as CompanyDto,
  type CreateCompanyBody,
  type CreateJobBody,
  type CursorPageMeta,
  type EmployerApplicant,
  type EmployerJob,
  ErrorCode,
  hasStanding,
  type UpdateApplicationStatusBody,
  type UpdateCompanyBody,
  type UpdateCompanyMemberBody,
  type UpdateJobBody,
} from "@baydar/shared";
import { Injectable } from "@nestjs/common";

import { DomainException } from "../../common/domain-exception";
import { EmployerEntitlementsService } from "../billing/employer-entitlements.service";
import { JobAlertsService } from "../jobs/job-alerts.service";
import { KaramaService } from "../karama/karama.service";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";

import type { CompanyRole } from "./guards/company-role.guard";

@Injectable()
export class CompaniesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly karama: KaramaService,
    private readonly entitlements: EmployerEntitlementsService,
    private readonly jobAlerts: JobAlertsService,
  ) {}

  // ───────────────────────── Company CRUD ─────────────────────────

  async create(creatorId: string, body: CreateCompanyBody): Promise<CompanyDto> {
    const existing = await this.prisma.company.findUnique({ where: { slug: body.slug } });
    if (existing) {
      throw new DomainException(ErrorCode.CONFLICT, "Slug already taken.", 409);
    }

    const company = await this.prisma.$transaction(async (tx) => {
      const created = await tx.company.create({
        data: {
          slug: body.slug,
          name: body.name,
          tagline: body.tagline ?? null,
          about: body.about ?? null,
          website: body.website ?? null,
          industry: body.industry ?? null,
          sizeBucket: body.sizeBucket ?? null,
          logoUrl: body.logoUrl ?? null,
          coverUrl: body.coverUrl ?? null,
          country: body.country,
          city: body.city ?? null,
        },
      });
      await tx.companyMember.create({
        data: { companyId: created.id, userId: creatorId, role: "OWNER" },
      });

      // Auto-mint a 30-day rolling EMPLOYER_FREE subscription so entitlements
      // checks always find an explicit plan rather than falling back to the
      // implicit "no subscription = limit 1" path.
      const freePlan = await tx.plan.findUnique({ where: { code: "EMPLOYER_FREE" } });
      if (freePlan) {
        const now = new Date();
        const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        await tx.subscription.create({
          data: {
            companyId: created.id,
            planId: freePlan.id,
            status: "ACTIVE",
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
          },
        });
      }

      return created;
    });
    return toCompanyDto(company);
  }

  async findByIdOrSlug(viewerId: string | null, idOrSlug: string): Promise<CompanyDto> {
    const company = await this.prisma.company.findFirst({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
    });
    if (!company) throw new DomainException(ErrorCode.NOT_FOUND, "Company not found.", 404);
    // viewerId currently unused for public read; reserved for member-only fields.
    void viewerId;
    return toCompanyDto(company);
  }

  async update(companyId: string, body: UpdateCompanyBody): Promise<CompanyDto> {
    const company = await this.prisma.company.update({
      where: { id: companyId },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.tagline !== undefined ? { tagline: body.tagline ?? null } : {}),
        ...(body.about !== undefined ? { about: body.about ?? null } : {}),
        ...(body.website !== undefined ? { website: body.website ?? null } : {}),
        ...(body.industry !== undefined ? { industry: body.industry ?? null } : {}),
        ...(body.sizeBucket !== undefined ? { sizeBucket: body.sizeBucket ?? null } : {}),
        ...(body.logoUrl !== undefined ? { logoUrl: body.logoUrl ?? null } : {}),
        ...(body.coverUrl !== undefined ? { coverUrl: body.coverUrl ?? null } : {}),
        ...(body.country !== undefined ? { country: body.country } : {}),
        ...(body.city !== undefined ? { city: body.city ?? null } : {}),
      },
    });
    return toCompanyDto(company);
  }

  async remove(companyId: string): Promise<void> {
    await this.prisma.company.delete({ where: { id: companyId } });
  }

  async listForViewer(viewerId: string): Promise<CompanySummary[]> {
    const memberships = await this.prisma.companyMember.findMany({
      where: { userId: viewerId },
      orderBy: { createdAt: "desc" },
      select: {
        role: true,
        company: { select: { id: true, slug: true, name: true, logoUrl: true, verified: true } },
      },
    });
    return memberships.map((m) => ({
      id: m.company.id,
      slug: m.company.slug,
      name: m.company.name,
      logoUrl: m.company.logoUrl,
      verified: m.company.verified,
      viewerRole: m.role,
    }));
  }

  // ───────────────────────── Members ─────────────────────────

  async listMembers(companyId: string): Promise<CompanyMemberDto[]> {
    const rows = await this.prisma.companyMember.findMany({
      where: { companyId },
      orderBy: { createdAt: "asc" },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            profile: {
              select: { handle: true, firstName: true, lastName: true, avatarUrl: true },
            },
          },
        },
      },
    });
    return rows.map(toMemberDto);
  }

  async addMember(
    companyId: string,
    actorRole: CompanyRole,
    body: AddCompanyMemberBody,
  ): Promise<CompanyMemberDto> {
    // The route admits ADMIN, so without this an ADMIN could mint an OWNER and
    // outrank the person who invited them.
    if (body.role === "OWNER" && actorRole !== "OWNER") {
      throw new DomainException(
        ErrorCode.AUTH_FORBIDDEN,
        "Only an owner can grant the owner role.",
        403,
      );
    }
    const exists = await this.prisma.companyMember.findUnique({
      where: { companyId_userId: { companyId, userId: body.userId } },
    });
    if (exists) {
      throw new DomainException(ErrorCode.CONFLICT, "User already a member.", 409);
    }
    const row = await this.prisma.companyMember.create({
      data: { companyId, userId: body.userId, role: body.role },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            profile: {
              select: { handle: true, firstName: true, lastName: true, avatarUrl: true },
            },
          },
        },
      },
    });
    return toMemberDto(row);
  }

  async updateMember(
    companyId: string,
    userId: string,
    actorId: string,
    body: UpdateCompanyMemberBody,
  ): Promise<CompanyMemberDto> {
    if (actorId === userId && body.role !== "OWNER") {
      const owners = await this.prisma.companyMember.count({
        where: { companyId, role: "OWNER" },
      });
      const target = await this.prisma.companyMember.findUnique({
        where: { companyId_userId: { companyId, userId } },
        select: { role: true },
      });
      if (target?.role === "OWNER" && owners <= 1) {
        throw new DomainException(
          ErrorCode.CONFLICT,
          "Cannot demote the last remaining owner.",
          409,
        );
      }
    }
    const row = await this.prisma.companyMember.update({
      where: { companyId_userId: { companyId, userId } },
      data: { role: body.role },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            profile: {
              select: { handle: true, firstName: true, lastName: true, avatarUrl: true },
            },
          },
        },
      },
    });
    return toMemberDto(row);
  }

  async removeMember(companyId: string, userId: string): Promise<void> {
    const target = await this.prisma.companyMember.findUnique({
      where: { companyId_userId: { companyId, userId } },
      select: { role: true },
    });
    if (!target) throw new DomainException(ErrorCode.NOT_FOUND, "Member not found.", 404);
    if (target.role === "OWNER") {
      const owners = await this.prisma.companyMember.count({
        where: { companyId, role: "OWNER" },
      });
      if (owners <= 1) {
        throw new DomainException(
          ErrorCode.CONFLICT,
          "Cannot remove the last remaining owner.",
          409,
        );
      }
    }
    await this.prisma.companyMember.delete({ where: { companyId_userId: { companyId, userId } } });
  }

  // ───────────────────────── Employer jobs ─────────────────────────

  async createJob(
    companyId: string,
    posterId: string,
    body: Omit<CreateJobBody, "companyId">,
  ): Promise<EmployerJob> {
    if (
      body.salaryMin !== undefined &&
      body.salaryMax !== undefined &&
      body.salaryMax < body.salaryMin
    ) {
      throw new DomainException(
        ErrorCode.VALIDATION_FAILED,
        "salaryMax must be greater than or equal to salaryMin.",
        400,
      );
    }
    // Per-company advisory lock serializes limit check + credit spend + job
    // insert, closing the under-limit race and the credit-spent-but-create-failed leak.
    const job = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${companyId}))`;
      await this.entitlements.assertCanCreateJob(companyId, tx);
      return tx.job.create({
        data: {
          companyId,
          postedById: posterId,
          title: body.title,
          description: body.description,
          type: body.type,
          locationMode: body.locationMode,
          city: body.city ?? null,
          country: body.country,
          salaryMin: body.salaryMin ?? null,
          salaryMax: body.salaryMax ?? null,
          salaryCurrency: body.salaryCurrency,
          skillsRequired: body.skillsRequired,
          occupationKey: body.occupationKey ?? null,
          minStanding: body.minStanding ?? null,
          requiresLicence: body.requiresLicence,
          licenceBodyKey: body.licenceBodyKey ?? null,
          payBasis: body.payBasis,
          mustSkills: body.mustSkills,
          startsAt: body.startsAt ? new Date(body.startsAt) : null,
          durationDays: body.durationDays ?? null,
          expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        },
      });
    });
    // Post-commit, fire-and-forget: alert subscribers about the new role.
    void this.jobAlerts.notifyMatches(job);
    return this.attachJobCounts(job);
  }

  async updateJob(companyId: string, jobId: string, body: UpdateJobBody): Promise<EmployerJob> {
    const existing = await this.prisma.job.findFirst({
      where: { id: jobId, companyId, deletedAt: null },
      select: {
        id: true,
        occupationKey: true,
        minStanding: true,
        salaryMin: true,
        salaryMax: true,
      },
    });
    if (!existing) throw new DomainException(ErrorCode.NOT_FOUND, "Job not found.", 404);

    // `CreateJobBody`'s refinements cannot carry over: `.partial()` only exists on
    // the un-refined base, and a PATCH of `minStanding` alone has no occupationKey
    // to check it against anyway. So the pair is re-checked here against the merge
    // of body and stored row — the only place that sees both.
    const occupationKey =
      body.occupationKey !== undefined ? body.occupationKey : existing.occupationKey;
    const minStanding = body.minStanding !== undefined ? body.minStanding : existing.minStanding;
    if (minStanding && occupationKey && !hasStanding(occupationKey)) {
      throw new DomainException(
        ErrorCode.VALIDATION_FAILED,
        "MIN_STANDING_REQUIRES_CRAFT_OCCUPATION",
        400,
      );
    }
    const salaryMin = body.salaryMin !== undefined ? body.salaryMin : existing.salaryMin;
    const salaryMax = body.salaryMax !== undefined ? body.salaryMax : existing.salaryMax;
    if (salaryMin && salaryMax && salaryMax < salaryMin) {
      throw new DomainException(ErrorCode.VALIDATION_FAILED, "SALARY_RANGE_INVERTED", 400);
    }

    const job = await this.prisma.job.update({
      where: { id: jobId },
      data: {
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.type !== undefined ? { type: body.type } : {}),
        ...(body.locationMode !== undefined ? { locationMode: body.locationMode } : {}),
        ...(body.city !== undefined ? { city: body.city ?? null } : {}),
        ...(body.country !== undefined ? { country: body.country } : {}),
        ...(body.salaryMin !== undefined ? { salaryMin: body.salaryMin ?? null } : {}),
        ...(body.salaryMax !== undefined ? { salaryMax: body.salaryMax ?? null } : {}),
        ...(body.salaryCurrency !== undefined ? { salaryCurrency: body.salaryCurrency } : {}),
        ...(body.skillsRequired !== undefined ? { skillsRequired: body.skillsRequired } : {}),
        // Without these the contract accepts eight fields and silently drops them:
        // an employer editing a job's pay basis would get a 200 and no change.
        ...(body.occupationKey !== undefined ? { occupationKey: body.occupationKey ?? null } : {}),
        ...(body.minStanding !== undefined ? { minStanding: body.minStanding ?? null } : {}),
        ...(body.requiresLicence !== undefined ? { requiresLicence: body.requiresLicence } : {}),
        ...(body.licenceBodyKey !== undefined
          ? { licenceBodyKey: body.licenceBodyKey ?? null }
          : {}),
        ...(body.payBasis !== undefined ? { payBasis: body.payBasis } : {}),
        ...(body.mustSkills !== undefined ? { mustSkills: body.mustSkills } : {}),
        ...(body.startsAt !== undefined
          ? { startsAt: body.startsAt ? new Date(body.startsAt) : null }
          : {}),
        ...(body.durationDays !== undefined ? { durationDays: body.durationDays ?? null } : {}),
        ...(body.expiresAt !== undefined
          ? { expiresAt: body.expiresAt ? new Date(body.expiresAt) : null }
          : {}),
      },
    });
    return this.attachJobCounts(job);
  }

  async archiveJob(companyId: string, jobId: string): Promise<EmployerJob> {
    const existing = await this.prisma.job.findFirst({
      where: { id: jobId, companyId, deletedAt: null },
      select: { id: true },
    });
    if (!existing) throw new DomainException(ErrorCode.NOT_FOUND, "Job not found.", 404);

    const job = await this.prisma.job.update({
      where: { id: jobId },
      data: { isActive: false, deletedAt: new Date() },
    });
    return this.attachJobCounts(job);
  }

  async listCompanyJobs(
    companyId: string,
    cursor: string | null,
    limit: number,
    filter: "active" | "archived" | "all",
  ): Promise<{ data: EmployerJob[]; meta: CursorPageMeta }> {
    const take = Math.min(Math.max(limit, 1), 50);
    const where = {
      companyId,
      ...(filter === "active" ? { isActive: true, deletedAt: null } : {}),
      ...(filter === "archived" ? { OR: [{ isActive: false }, { deletedAt: { not: null } }] } : {}),
    };
    const rows = await this.prisma.job.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    const hasMore = rows.length > take;
    const trimmed = hasMore ? rows.slice(0, take) : rows;
    const counts = await this.jobCounts(trimmed.map((j) => j.id));
    const data = trimmed.map((j) => toEmployerJob(j, counts));
    return {
      data,
      meta: {
        nextCursor: hasMore ? trimmed[trimmed.length - 1]!.id : null,
        hasMore,
        limit: take,
      },
    };
  }

  // ───────────────────────── Applicants ─────────────────────────

  async listApplicants(
    companyId: string,
    jobId: string,
    cursor: string | null,
    limit: number,
    status: ApplicationStatus | null,
  ): Promise<{ data: EmployerApplicant[]; meta: CursorPageMeta }> {
    const job = await this.prisma.job.findFirst({
      where: { id: jobId, companyId },
      select: { id: true },
    });
    if (!job) throw new DomainException(ErrorCode.NOT_FOUND, "Job not found.", 404);

    const take = Math.min(Math.max(limit, 1), 50);
    const rows = await this.prisma.application.findMany({
      where: { jobId, ...(status ? { status } : {}) },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        applicant: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                handle: true,
                firstName: true,
                lastName: true,
                headline: true,
                avatarUrl: true,
                location: true,
                country: true,
              },
            },
          },
        },
      },
    });
    const hasMore = rows.length > take;
    const trimmed = hasMore ? rows.slice(0, take) : rows;
    return {
      data: trimmed.map(toApplicantDto),
      meta: {
        nextCursor: hasMore ? trimmed[trimmed.length - 1]!.id : null,
        hasMore,
        limit: take,
      },
    };
  }

  async updateApplicantStatus(
    companyId: string,
    jobId: string,
    applicationId: string,
    actorId: string,
    body: UpdateApplicationStatusBody,
  ): Promise<EmployerApplicant> {
    const existing = await this.prisma.application.findFirst({
      where: { id: applicationId, jobId, job: { companyId } },
      include: {
        applicant: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                handle: true,
                firstName: true,
                lastName: true,
                headline: true,
                avatarUrl: true,
                location: true,
                country: true,
              },
            },
          },
        },
      },
    });
    if (!existing) throw new DomainException(ErrorCode.NOT_FOUND, "Application not found.", 404);

    if (existing.status === body.status) {
      return toApplicantDto(existing);
    }

    const updated = await this.prisma.application.update({
      where: { id: applicationId },
      data: { status: body.status },
      include: {
        applicant: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                handle: true,
                firstName: true,
                lastName: true,
                headline: true,
                avatarUrl: true,
                location: true,
                country: true,
              },
            },
          },
        },
      },
    });

    void this.notifications.notify({
      type: "JOB_APPLICATION_UPDATE",
      recipientId: existing.applicantId,
      actorId,
      jobId,
      data: { applicationId, status: body.status },
    });

    // Reward the candidate for a verified hire. Plan calls for a 30-day
    // delay; for the beta we award immediately and rely on rescindable
    // adjustments if the hire is reversed.
    //
    // `awardOnce`, not `award`: the transition guard below only blocks
    // HIRED → HIRED. An employer flipping HIRED → REJECTED → HIRED re-enters
    // this branch every cycle, and `award` has no idempotency, so each cycle
    // minted another 200 points. The (userId, reason, refType, refId) unique
    // on KaramaLedger makes the application id the one-time key.
    if (body.status === "HIRED" && existing.status !== "HIRED") {
      void this.karama.awardOnce({
        userId: existing.applicantId,
        reason: "VERIFIED_HIRE",
        refType: "application",
        refId: applicationId,
      });
    }

    return toApplicantDto(updated);
  }

  // ───────────────────────── Helpers ─────────────────────────

  private async attachJobCounts(job: JobRow): Promise<EmployerJob> {
    return toEmployerJob(job, await this.jobCounts([job.id]));
  }

  /**
   * One grouped query for a whole page. Two `count()` per job meant 100 queries
   * at the 50-job page limit.
   */
  private async jobCounts(jobIds: string[]): Promise<Map<string, JobCounts>> {
    const counts = new Map<string, JobCounts>();
    if (jobIds.length === 0) return counts;
    const rows = await this.prisma.application.groupBy({
      by: ["jobId", "status"],
      where: { jobId: { in: jobIds } },
      _count: { _all: true },
    });
    for (const row of rows) {
      const entry = counts.get(row.jobId) ?? { applicantCount: 0, shortlistCount: 0 };
      entry.applicantCount += row._count._all;
      if (row.status === ApplicationStatus.SHORTLISTED) entry.shortlistCount += row._count._all;
      counts.set(row.jobId, entry);
    }
    return counts;
  }
}

type JobCounts = { applicantCount: number; shortlistCount: number };

type JobRow = {
  id: string;
  // Nullable at the DB level for individual-posted work. Every job reaching
  // this employer-scoped mapper does have a company, but the type follows the
  // schema rather than the happy path.
  companyId: string | null;
  title: string;
  type: EmployerJob["type"];
  locationMode: EmployerJob["locationMode"];
  city: string | null;
  isActive: boolean;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

function toEmployerJob(job: JobRow, counts: Map<string, JobCounts>): EmployerJob {
  const { applicantCount, shortlistCount } = counts.get(job.id) ?? {
    applicantCount: 0,
    shortlistCount: 0,
  };
  return {
    id: job.id,
    companyId: job.companyId,
    title: job.title,
    type: job.type,
    locationMode: job.locationMode,
    city: job.city,
    isActive: job.isActive,
    expiresAt: job.expiresAt ? job.expiresAt.toISOString() : null,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
    applicantCount,
    shortlistCount,
  };
}

function toCompanyDto(row: {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  about: string | null;
  website: string | null;
  industry: string | null;
  sizeBucket: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  country: string;
  city: string | null;
  verified: boolean;
  createdAt: Date;
  updatedAt: Date;
}): CompanyDto {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    tagline: row.tagline ?? undefined,
    about: row.about ?? undefined,
    website: row.website ?? undefined,
    industry: row.industry ?? undefined,
    sizeBucket: (row.sizeBucket as CompanyDto["sizeBucket"]) ?? undefined,
    logoUrl: row.logoUrl ?? undefined,
    coverUrl: row.coverUrl ?? undefined,
    country: row.country,
    city: row.city ?? undefined,
    verified: row.verified,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toMemberDto(row: {
  id: string;
  companyId: string;
  userId: string;
  role: CompanyMemberDto["role"];
  createdAt: Date;
  user: {
    id: string;
    email: string | null;
    profile: {
      handle: string;
      firstName: string;
      lastName: string;
      avatarUrl: string | null;
    } | null;
  };
}): CompanyMemberDto {
  return {
    id: row.id,
    companyId: row.companyId,
    userId: row.userId,
    role: row.role,
    createdAt: row.createdAt.toISOString(),
    user: {
      id: row.user.id,
      email: row.user.email,
      profile: row.user.profile,
    },
  };
}

function toApplicantDto(row: {
  id: string;
  jobId: string;
  applicantId: string;
  status: ApplicationStatus;
  resumeUrl: string | null;
  coverLetter: string | null;
  createdAt: Date;
  updatedAt: Date;
  applicant: {
    id: string;
    email: string;
    profile: {
      handle: string;
      firstName: string;
      lastName: string;
      headline: string | null;
      avatarUrl: string | null;
      location: string | null;
      country: string | null;
    } | null;
  };
}): EmployerApplicant {
  return {
    id: row.id,
    jobId: row.jobId,
    applicantId: row.applicantId,
    status: row.status,
    resumeUrl: row.resumeUrl,
    coverLetter: row.coverLetter,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    applicant: row.applicant,
  };
}
