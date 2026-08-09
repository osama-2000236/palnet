import {
  ErrorCode,
  type Recommendation,
  type RequestRecommendationBody,
  type RespondToRecommendationBody,
  type SetRecommendationVisibilityBody,
  type WriteRecommendationBody,
} from "@baydar/shared";
import { Injectable } from "@nestjs/common";

import { DomainException } from "../../common/domain-exception";
import { StandingService } from "../evidence/standing.service";
import { PrismaService } from "../prisma/prisma.service";

import { recommendationInclude, toRecommendationDto } from "./recommendations.mapper";

// A named person putting their reputation behind somebody.
//
// Two rules make this worth reading, and both are enforced here rather than in
// the UI:
//
//   1. The subject may HIDE a published recommendation. They may never edit it.
//      There is no route that lets a subject change the body, because a
//      testimonial the subject can rewrite is not a testimonial.
//   2. One per (author, subject, occupation). A second testimonial from the
//      same person about the same work is not more evidence — the database
//      unique constraint is the real enforcement and this is the friendly error.

@Injectable()
export class RecommendationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly standing: StandingService,
  ) {}

  /** Ask somebody to write one. Creates the PENDING row they will fill in. */
  async request(subjectId: string, body: RequestRecommendationBody): Promise<Recommendation> {
    this.assertNotSelf(subjectId, body.authorId);
    const row = await this.upsertPending({
      authorId: body.authorId,
      subjectId,
      relationship: body.relationship,
      occupationKey: body.occupationKey ?? "",
      body: body.note ?? "",
    });
    return toRecommendationDto(row);
  }

  /**
   * Write one, unprompted or in answer to a request.
   *
   * Published immediately. Holding it for the subject's approval would make
   * every published recommendation one the subject liked, which is the same as
   * publishing none.
   */
  async write(authorId: string, body: WriteRecommendationBody): Promise<Recommendation> {
    this.assertNotSelf(body.subjectId, authorId);
    const row = await this.upsertPending({
      authorId,
      subjectId: body.subjectId,
      relationship: body.relationship,
      occupationKey: body.occupationKey ?? "",
      body: body.body,
      publish: true,
    });
    await this.afterPublish(body.subjectId, body.occupationKey ?? "");
    return toRecommendationDto(row);
  }

  /** Answer a request: publish it, or decline. A decline is silent to the subject. */
  async respond(
    authorId: string,
    id: string,
    body: RespondToRecommendationBody,
  ): Promise<Recommendation> {
    const existing = await this.prisma.recommendation.findFirst({ where: { id, authorId } });
    if (!existing) throw new DomainException(ErrorCode.NOT_FOUND, "Not found.", 404);
    if (existing.status !== "PENDING") {
      throw new DomainException(ErrorCode.CONFLICT, "That request is already answered.", 409);
    }
    if (body.action === "PUBLISH" && !body.body) {
      throw new DomainException(ErrorCode.VALIDATION_FAILED, "Write something first.", 400);
    }

    const row = await this.prisma.recommendation.update({
      where: { id },
      data: {
        status: body.action === "PUBLISH" ? "PUBLISHED" : "DECLINED",
        body: body.body ?? existing.body,
        respondedAt: new Date(),
      },
      include: recommendationInclude,
    });

    if (body.action === "PUBLISH") {
      await this.afterPublish(existing.subjectId, existing.occupationKey);
    }
    return toRecommendationDto(row);
  }

  /**
   * The author's own lever. They wrote it; they may take it back.
   *
   * Withdrawn rather than deleted, so a subject who screenshots a testimonial
   * and an author who regrets it leave the same trace for a moderator.
   */
  async withdraw(authorId: string, id: string): Promise<Recommendation> {
    const existing = await this.prisma.recommendation.findFirst({ where: { id, authorId } });
    if (!existing) throw new DomainException(ErrorCode.NOT_FOUND, "Not found.", 404);

    const row = await this.prisma.recommendation.update({
      where: { id },
      data: { status: "WITHDRAWN" },
      include: recommendationInclude,
    });
    await this.afterPublish(existing.subjectId, existing.occupationKey);
    return toRecommendationDto(row);
  }

  /** The subject's only lever. Hide, or show again. Never edit. */
  async setVisibility(
    subjectId: string,
    id: string,
    body: SetRecommendationVisibilityBody,
  ): Promise<Recommendation> {
    const existing = await this.prisma.recommendation.findFirst({ where: { id, subjectId } });
    if (!existing) throw new DomainException(ErrorCode.NOT_FOUND, "Not found.", 404);

    const row = await this.prisma.recommendation.update({
      where: { id },
      data: { hiddenBySubject: body.hidden },
      include: recommendationInclude,
    });
    await this.afterPublish(subjectId, existing.occupationKey);
    return toRecommendationDto(row);
  }

  /**
   * Somebody's published, unhidden testimonials.
   *
   * The subject sees their own pending and hidden ones too — otherwise a
   * request they sent yesterday appears to have vanished.
   */
  async listFor(handle: string, viewerId: string | null): Promise<Recommendation[]> {
    const profile = await this.prisma.profile.findUnique({
      where: { handle },
      select: { userId: true },
    });
    if (!profile) throw new DomainException(ErrorCode.NOT_FOUND, "Not found.", 404);

    const isSelf = viewerId === profile.userId;
    const rows = await this.prisma.recommendation.findMany({
      where: {
        subjectId: profile.userId,
        ...(isSelf ? {} : { status: "PUBLISHED", hiddenBySubject: false }),
      },
      include: recommendationInclude,
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return rows.map(toRecommendationDto);
  }

  /** Pending rows waiting on the signed-in member to write something. */
  async listRequestsForMe(authorId: string): Promise<Recommendation[]> {
    const rows = await this.prisma.recommendation.findMany({
      where: { authorId, status: "PENDING" },
      include: recommendationInclude,
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return rows.map(toRecommendationDto);
  }

  private assertNotSelf(subjectId: string, authorId: string): void {
    if (subjectId === authorId) {
      throw new DomainException(
        ErrorCode.RECOMMENDATION_SELF,
        "You cannot recommend yourself.",
        400,
      );
    }
  }

  private async upsertPending(input: {
    authorId: string;
    subjectId: string;
    relationship: Recommendation["relationship"];
    occupationKey: string;
    body: string;
    publish?: boolean;
  }) {
    const key = {
      authorId_subjectId_occupationKey: {
        authorId: input.authorId,
        subjectId: input.subjectId,
        occupationKey: input.occupationKey,
      },
    };
    const existing = await this.prisma.recommendation.findUnique({ where: key });
    if (existing && existing.status === "PUBLISHED" && !input.publish) {
      throw new DomainException(
        ErrorCode.RECOMMENDATION_DUPLICATE,
        "They have already written one.",
        409,
      );
    }

    return this.prisma.recommendation.upsert({
      where: key,
      create: {
        authorId: input.authorId,
        subjectId: input.subjectId,
        relationship: input.relationship,
        occupationKey: input.occupationKey,
        body: input.body,
        status: input.publish ? "PUBLISHED" : "PENDING",
        requestedAt: input.publish ? null : new Date(),
        respondedAt: input.publish ? new Date() : null,
      },
      update: {
        relationship: input.relationship,
        body: input.body,
        status: input.publish ? "PUBLISHED" : "PENDING",
        respondedAt: input.publish ? new Date() : null,
      },
      include: recommendationInclude,
    });
  }

  /**
   * A published testimonial moves both cached numbers.
   *
   * A body-verified author's recommendation can sponsor a rung-4 standing on
   * its own, so the ladder is recomputed too — not only the score.
   */
  private async afterPublish(subjectId: string, occupationKey: string): Promise<void> {
    // "" is a general testimonial and belongs to no rung, so only a keyed one
    // moves the ladder.
    if (occupationKey) await this.standing.recompute(subjectId, occupationKey);
    await this.standing.recomputeScore(subjectId);
  }
}
