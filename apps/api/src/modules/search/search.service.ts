import { Injectable } from "@nestjs/common";
import { Prisma } from "@palnet/db";
import type { CursorPageMeta, PeopleSearchQuery, SearchPersonHit } from "@palnet/shared";

import { ModerationService } from "../moderation/moderation.service";
import { PrismaService } from "../prisma/prisma.service";

interface ProfileSearchRow {
  id: string;
  userId: string;
  handle: string;
  firstName: string;
  lastName: string;
  headline: string | null;
  location: string | null;
  avatarUrl: string | null;
  rank: number;
}

@Injectable()
export class SearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly moderation: ModerationService,
  ) {}

  async people(
    query: PeopleSearchQuery,
    viewerId: string | null,
  ): Promise<{ data: SearchPersonHit[]; meta: CursorPageMeta }> {
    const q = query.q.trim();
    const limit = query.limit;

    // Anyone on either side of a block with the viewer is dropped from the
    // results. Anonymous search skips this — the blocked relationship only
    // exists in the authed context anyway.
    const blocked = viewerId ? await this.moderation.blockedIds(viewerId) : [];

    const blockedClause =
      blocked.length > 0
        ? Prisma.sql`AND p."userId" NOT IN (${Prisma.join(blocked)})`
        : Prisma.empty;
    const cursorClause = query.after
      ? Prisma.sql`
        WHERE (
          "rank" < (SELECT "rank" FROM hits WHERE "id" = ${query.after})
          OR (
            "rank" = (SELECT "rank" FROM hits WHERE "id" = ${query.after})
            AND "id" > ${query.after}
          )
        )
      `
      : Prisma.empty;

    const rows = await this.prisma.$queryRaw<ProfileSearchRow[]>`
      WITH search AS (
        SELECT plainto_tsquery('simple', ${q}) AS query
      ), hits AS (
        SELECT
          p."id",
          p."userId",
          p."handle",
          p."firstName",
          p."lastName",
          p."headline",
          p."location",
          p."avatarUrl",
          ts_rank_cd(p."searchVector", search.query) AS "rank"
        FROM "Profile" p, search
        WHERE p."searchVector" @@ search.query
        ${blockedClause}
      )
      SELECT * FROM hits
      ${cursorClause}
      ORDER BY "rank" DESC, "id" ASC
      LIMIT ${limit + 1}
    `;

    const hasMore = rows.length > limit;
    const trimmed = hasMore ? rows.slice(0, limit) : rows;

    return {
      data: trimmed.map<SearchPersonHit>((p) => ({
        userId: p.userId,
        handle: p.handle,
        firstName: p.firstName,
        lastName: p.lastName,
        headline: p.headline,
        location: p.location,
        avatarUrl: p.avatarUrl,
      })),
      meta: {
        nextCursor: hasMore ? trimmed[trimmed.length - 1]!.id : null,
        hasMore,
        limit,
      },
    };
  }
}
