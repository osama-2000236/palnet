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
  type UpdateApplicationStatusBody,
  type UpdateCompanyBody,
  type UpdateCompanyMemberBody,
  type UpdateJobBody,
} from "@baydar/shared";
import { Injectable } from "@nestjs/common";

import { DomainException } from "../../common/domain-exception";
import { EmployerEntitlementsService } from "../billing/employer-entitlements.service";
import { KaramaService } from "../karama/karama.service";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class CompaniesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly karama: KaramaService,
    private readonly entitlements: EmployerEntitlementsService,
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

  async addMember(companyId: string, body: AddCompanyMemberBody): Promise<CompanyMemberDto> {
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
    await this.entitlements.assertCanCreateJob(companyId);

    const job = await this.prisma.job.create({
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
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      },
    });
    return this.attachJobCounts(job);
  }

  async updateJob(companyId: string, jobId: string, body: UpdateJobBody): Promise<EmployerJob> {
    const existing = await this.prisma.job.findFirst({
      where: { id: jobId, companyId, deletedAt: null },
      select: { id: true },
    });
    if (!existing) throw new DomainException(ErrorCode.NOT_FOUND, "Job not found.", 404);

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
    const data = await Promise.all(trimmed.map((j) => this.attachJobCounts(j)));
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
    if (body.status === "HIRED" && existing.status !== "HIRED") {
      void this.karama.award({
        userId: existing.applicantId,
        reason: "VERIFIED_HIRE",
        refType: "application",
        refId: applicationId,
      });
    }

    return toApplicantDto(updated);
  }

  // ───────────────────────── Helpers ─────────────────────────

  private async attachJobCounts(job: {
    id: string;
    companyId: string;
    title: string;
    type: EmployerJob["type"];
    locationMode: EmployerJob["locationMode"];
    city: string | null;
    isActive: boolean;
    expiresAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): Promise<EmployerJob> {
    const [applicantCount, shortlistCount] = await Promise.all([
      this.prisma.application.count({ where: { jobId: job.id } }),
      this.prisma.application.count({ where: { jobId: job.id, status: "SHORTLISTED" } }),
    ]);
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
