import { Injectable } from "@nestjs/common";
import {
  CompanyMemberRole,
  type Company as CompanyDto,
  type CompanyDetail,
  type CompanyMember,
  type ManagedCompany,
  CreateCompanyBody,
  ErrorCode,
  type UpdateCompanyBody,
  type AddCompanyMemberBody,
} from "@palnet/shared";

import { DomainException } from "../../common/domain-exception";
import type { AuthUser } from "../auth/decorators/current-user.decorator";
import {
  toCompanyDto,
  toCompanyJobPreview,
  toCompanyMemberDto,
} from "../jobs/jobs.mapper";
import { PrismaService } from "../prisma/prisma.service";

type CompanyRecord = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  about: string | null;
  website: string | null;
  industry: string | null;
  sizeBucket: CompanyDto["sizeBucket"];
  logoUrl: string | null;
  logoBlur: string | null;
  coverUrl: string | null;
  coverBlur: string | null;
  country: string;
  city: string | null;
  verified: boolean;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  async listManaged(viewer: AuthUser): Promise<ManagedCompany[]> {
    const rows = await this.prisma.company.findMany({
      where:
        viewer.role === "ADMIN"
          ? {}
          : { members: { some: { userId: viewer.id } } },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
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
          select: { id: true, userId: true, role: true },
        },
        jobs: {
          where: { deletedAt: null, isActive: true },
          select: { id: true },
        },
      },
    });

    return rows.map((row) => {
      const membership = row.members.find((member) => member.userId === viewer.id);
      const isAdmin = viewer.role === "ADMIN";
      return {
        id: row.id,
        slug: row.slug,
        name: row.name,
        tagline: row.tagline,
        logoUrl: row.logoUrl,
        logoBlur: row.logoBlur,
        city: row.city,
        country: row.country,
        viewer: {
          canManage: isAdmin || isManageRole(membership?.role),
          canEdit: isAdmin || isEditorOrAbove(membership?.role),
          role: membership?.role ?? null,
        },
        counts: {
          members: row.members.length,
          activeJobs: row.jobs.length,
        },
      };
    });
  }

  async create(viewer: AuthUser, body: CreateCompanyBody): Promise<CompanyDto> {
    const parsed = CreateCompanyBody.parse(body);
    const existing = await this.prisma.company.findUnique({
      where: { slug: parsed.slug },
      select: { id: true },
    });
    if (existing) {
      throw new DomainException(
        ErrorCode.CONFLICT,
        "Company slug already exists.",
        409,
      );
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          slug: parsed.slug,
          name: parsed.name,
          tagline: parsed.tagline ?? null,
          about: parsed.about ?? null,
          website: parsed.website ?? null,
          industry: parsed.industry ?? null,
          sizeBucket: parsed.sizeBucket ?? null,
          logoUrl: parsed.logoUrl ?? null,
          logoBlur: parsed.logoBlur ?? null,
          coverUrl: parsed.coverUrl ?? null,
          coverBlur: parsed.coverBlur ?? null,
          country: parsed.country,
          city: parsed.city ?? null,
          members: {
            create: {
              userId: viewer.id,
              role: CompanyMemberRole.OWNER,
            },
          },
        },
      });

      if (viewer.role === "USER") {
        await tx.user.update({
          where: { id: viewer.id },
          data: { role: "COMPANY_ADMIN" },
        });
      }

      return company;
    });

    return toCompanyDto(created as CompanyRecord);
  }

  async getBySlug(viewer: AuthUser, slug: string): Promise<CompanyDetail> {
    const row = await this.prisma.company.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        name: true,
        tagline: true,
        about: true,
        website: true,
        industry: true,
        sizeBucket: true,
        logoUrl: true,
        logoBlur: true,
        coverUrl: true,
        coverBlur: true,
        country: true,
        city: true,
        verified: true,
        createdAt: true,
        updatedAt: true,
        members: {
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          select: {
            id: true,
            companyId: true,
            role: true,
            createdAt: true,
            user: {
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
          },
        },
        jobs: {
          where: { deletedAt: null },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          select: {
            id: true,
            companyId: true,
            title: true,
            type: true,
            locationMode: true,
            city: true,
            country: true,
            isActive: true,
            createdAt: true,
            expiresAt: true,
            applications: {
              select: { id: true, applicantId: true },
            },
          },
        },
      },
    });

    if (!row) {
      throw new DomainException(ErrorCode.NOT_FOUND, "Company not found.", 404);
    }

    const membership = row.members.find((member) => member.user.id === viewer.id);
    const isAdmin = viewer.role === "ADMIN";
    const canManage = isAdmin || isManageRole(membership?.role);
    const canEdit = isAdmin || isEditorOrAbove(membership?.role);
    const jobs = row.jobs
      .filter((job) => canEdit || job.isActive)
      .map((job) => toCompanyJobPreview(job, viewer.id, canEdit));

    return {
      ...toCompanyDto(row as CompanyRecord),
      viewer: {
        canManage,
        canEdit,
        role: membership?.role ?? null,
      },
      counts: {
        members: row.members.length,
        activeJobs: row.jobs.filter((job) => job.isActive).length,
      },
      jobs,
      members: canManage ? row.members.map(toCompanyMemberDto) : [],
    };
  }

  async update(
    viewer: AuthUser,
    companyId: string,
    body: UpdateCompanyBody,
  ): Promise<CompanyDto> {
    const parsed = body;
    await this.assertCanManage(viewer, companyId, "ANY_EDITOR");

    const updated = await this.prisma.company.update({
      where: { id: companyId },
      data: {
        name: parsed.name,
        tagline: parsed.tagline,
        about: parsed.about,
        website: parsed.website,
        industry: parsed.industry,
        sizeBucket: parsed.sizeBucket,
        logoUrl: parsed.logoUrl,
        logoBlur: parsed.logoBlur,
        coverUrl: parsed.coverUrl,
        coverBlur: parsed.coverBlur,
        country: parsed.country,
        city: parsed.city,
      },
    });

    return toCompanyDto(updated as CompanyRecord);
  }

  async addMember(
    viewer: AuthUser,
    companyId: string,
    body: AddCompanyMemberBody,
  ): Promise<CompanyMember> {
    await this.assertCanManage(viewer, companyId);

    const user = await this.prisma.user.findUnique({
      where: { id: body.userId, deletedAt: null },
      select: { id: true },
    });
    if (!user) {
      throw new DomainException(ErrorCode.NOT_FOUND, "User not found.", 404);
    }

    const member = await this.prisma.companyMember.upsert({
      where: {
        companyId_userId: {
          companyId,
          userId: body.userId,
        },
      },
      update: { role: body.role },
      create: {
        companyId,
        userId: body.userId,
        role: body.role,
      },
      select: {
        id: true,
        companyId: true,
        role: true,
        createdAt: true,
        user: {
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
      },
    });

    return toCompanyMemberDto(member);
  }

  async removeMember(
    viewer: AuthUser,
    companyId: string,
    userId: string,
  ): Promise<void> {
    await this.assertCanManage(viewer, companyId);

    const member = await this.prisma.companyMember.findUnique({
      where: {
        companyId_userId: {
          companyId,
          userId,
        },
      },
      select: { id: true },
    });
    if (!member) {
      throw new DomainException(ErrorCode.NOT_FOUND, "Member not found.", 404);
    }

    await this.prisma.companyMember.delete({
      where: {
        companyId_userId: {
          companyId,
          userId,
        },
      },
    });
  }

  async assertCanManage(
    viewer: AuthUser,
    companyId: string,
    level: "OWNER_OR_ADMIN" | "ANY_EDITOR" = "OWNER_OR_ADMIN",
  ): Promise<{ id: string; slug: string; name: string; role: CompanyMemberRole | null }> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        slug: true,
        name: true,
        members: {
          where: { userId: viewer.id },
          select: { role: true },
          take: 1,
        },
      },
    });

    if (!company) {
      throw new DomainException(ErrorCode.NOT_FOUND, "Company not found.", 404);
    }

    const role = company.members[0]?.role ?? null;
    const ok =
      viewer.role === "ADMIN" ||
      (level === "ANY_EDITOR" ? isEditorOrAbove(role) : isManageRole(role));
    if (!ok) {
      throw new DomainException(
        ErrorCode.AUTH_FORBIDDEN,
        "You cannot manage this company.",
        403,
      );
    }

    return { id: company.id, slug: company.slug, name: company.name, role };
  }
}

function isManageRole(
  role: CompanyMemberRole | null | undefined,
): boolean {
  return role === CompanyMemberRole.OWNER || role === CompanyMemberRole.ADMIN;
}

function isEditorOrAbove(
  role: CompanyMemberRole | null | undefined,
): boolean {
  return (
    role === CompanyMemberRole.OWNER ||
    role === CompanyMemberRole.ADMIN ||
    role === CompanyMemberRole.EDITOR
  );
}
