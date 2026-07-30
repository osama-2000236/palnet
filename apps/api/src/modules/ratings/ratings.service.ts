import {
  type CreateRatingBody,
  type RatingContext,
  type RatingSummary,
  type UserRating,
  ErrorCode,
} from "@baydar/shared";
import { Injectable } from "@nestjs/common";

import { DomainException } from "../../common/domain-exception";
import { KaramaService } from "../karama/karama.service";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class RatingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly karama: KaramaService,
  ) {}

  async create(raterId: string, body: CreateRatingBody): Promise<UserRating> {
    if (raterId === body.rateeId) {
      throw new DomainException(ErrorCode.VALIDATION_FAILED, "Cannot rate yourself.", 400);
    }

    // EMPLOYER_RATES_CANDIDATE requires the rater to have actually employed/interviewed
    // the candidate via a real Application. CANDIDATE_RATES_EMPLOYER requires the
    // candidate to have applied. Both are enforced if jobId+applicationId provided.
    if (body.applicationId) {
      const application = await this.prisma.application.findUnique({
        where: { id: body.applicationId },
        select: {
          applicantId: true,
          job: { select: { companyId: true, postedById: true } },
        },
      });
      if (!application) {
        throw new DomainException(ErrorCode.NOT_FOUND, "Application not found.", 404);
      }
      if (body.context === "EMPLOYER_RATES_CANDIDATE") {
        // A job posted by an individual has no company, so there is no
        // membership to check: the poster is the only party who may rate.
        // Without this branch a null companyId would widen the check rather
        // than narrow it.
        const isMember = application.job.companyId
          ? await this.prisma.companyMember.findFirst({
              where: { companyId: application.job.companyId, userId: raterId },
              select: { id: true },
            })
          : application.job.postedById === raterId
            ? { id: application.job.postedById }
            : null;
        if (!isMember) {
          throw new DomainException(
            ErrorCode.AUTH_FORBIDDEN,
            "Only company members can rate this candidate.",
            403,
          );
        }
        if (body.rateeId !== application.applicantId) {
          throw new DomainException(
            ErrorCode.VALIDATION_FAILED,
            "Ratee does not match application applicant.",
            400,
          );
        }
      }
      if (body.context === "CANDIDATE_RATES_EMPLOYER") {
        if (raterId !== application.applicantId) {
          throw new DomainException(
            ErrorCode.AUTH_FORBIDDEN,
            "Only the applicant can rate this employer.",
            403,
          );
        }
        if (body.rateeId !== application.job.postedById) {
          throw new DomainException(
            ErrorCode.VALIDATION_FAILED,
            "Ratee does not match job poster.",
            400,
          );
        }
      }
    }

    // De-duplicate per (rater, ratee, context, jobId).
    const existing = await this.prisma.userRating.findFirst({
      where: {
        raterId,
        rateeId: body.rateeId,
        context: body.context,
        jobId: body.jobId ?? null,
      },
    });
    if (existing) {
      throw new DomainException(
        ErrorCode.CONFLICT,
        "You have already rated this user for this context.",
        409,
      );
    }

    const row = await this.prisma.userRating.create({
      data: {
        raterId,
        rateeId: body.rateeId,
        context: body.context,
        score: body.score,
        comment: body.comment ?? null,
        jobId: body.jobId ?? null,
        applicationId: body.applicationId ?? null,
      },
      include: {
        rater: {
          select: {
            id: true,
            profile: {
              select: {
                handle: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    // Award Karama: 5-star = full reason payout; 4-star = half; below 4 = 0.
    if (body.score >= 4) {
      const delta = body.score === 5 ? undefined : Math.floor(30 / 2);
      void this.karama.award({
        userId: body.rateeId,
        reason: "RATING_RECEIVED",
        delta,
        refType: "rating",
        refId: row.id,
      });
    }

    return toDto(row);
  }

  async listForUser(
    userId: string,
    context: RatingContext | null,
    limit: number,
  ): Promise<UserRating[]> {
    const take = Math.min(Math.max(limit, 1), 50);
    const rows = await this.prisma.userRating.findMany({
      where: { rateeId: userId, ...(context ? { context } : {}) },
      orderBy: { createdAt: "desc" },
      take,
      include: {
        rater: {
          select: {
            id: true,
            profile: {
              select: {
                handle: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });
    return rows.map(toDto);
  }

  async summary(userId: string, context: RatingContext): Promise<RatingSummary> {
    const agg = await this.prisma.userRating.aggregate({
      where: { rateeId: userId, context },
      _avg: { score: true },
      _count: { _all: true },
    });
    return {
      userId,
      context,
      average: agg._avg.score ?? 0,
      count: agg._count._all,
    };
  }
}

function toDto(row: {
  id: string;
  raterId: string;
  rateeId: string;
  context: RatingContext;
  score: number;
  comment: string | null;
  jobId: string | null;
  applicationId: string | null;
  createdAt: Date;
  rater: {
    id: string;
    profile: {
      handle: string;
      firstName: string;
      lastName: string;
      avatarUrl: string | null;
    } | null;
  };
}): UserRating {
  return {
    id: row.id,
    raterId: row.raterId,
    rateeId: row.rateeId,
    context: row.context,
    score: row.score,
    comment: row.comment,
    jobId: row.jobId,
    applicationId: row.applicationId,
    createdAt: row.createdAt.toISOString(),
    rater: row.rater,
  };
}
