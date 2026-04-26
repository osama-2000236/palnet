import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma } from "@baydar/db";
import {
  ErrorCode,
  type CursorPageMeta,
  type PeopleSearchQuery,
  type SearchPersonHit,
} from "@baydar/shared";

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

interface SearchCursor {
  rank: number;
  id: string;
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
    const q = normalizeSearchQuery(query.q);
    const limit = query.limit;
    const cursor = query.after ? decodeCursor(query.after) : null;

    // Anyone on either side of a block with the viewer is dropped from the
    // results. Anonymous search skips this — the blocked relationship only
    // exists in the authed context anyway.
    const blocked = viewerId ? await this.moderation.blockedIds(viewerId) : [];

    const blockedClause =
      blocked.length > 0
        ? Prisma.sql`AND p."userId" NOT IN (${Prisma.join(blocked)})`
        : Prisma.empty;
    const cursorClause = cursor
      ? Prisma.sql`
        AND (
          ts_rank_cd(p."searchVector", search.query) < ${cursor.rank}
          OR (
            ts_rank_cd(p."searchVector", search.query) = ${cursor.rank}
            AND p."id" > ${cursor.id}
          )
        )
      `
      : Prisma.empty;

    const rows = await this.prisma.$queryRaw<ProfileSearchRow[]>`
      WITH search AS (
        SELECT plainto_tsquery('simple', ${q}) AS query
      )
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
      ${cursorClause}
      ORDER BY "rank" DESC, p."id" ASC
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
        nextCursor: hasMore
          ? encodeCursor({
              rank: trimmed[trimmed.length - 1]!.rank,
              id: trimmed[trimmed.length - 1]!.id,
            })
          : null,
        hasMore,
        limit,
      },
    };
  }
}

function normalizeSearchQuery(value: string): string {
  return value
    .trim()
    .normalize("NFC")
    .split("")
    .filter((char) => {
      const codePoint = char.codePointAt(0) ?? 0;
      return (
        codePoint !== 0x0640 && codePoint !== 0x0670 && (codePoint < 0x064b || codePoint > 0x065f)
      );
    })
    .join("")
    .replace(/[إأآٱ]/g, "ا");
}

function encodeCursor(cursor: SearchCursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

function decodeCursor(value: string): SearchCursor {
  try {
    const parsed = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8"),
    ) as Partial<SearchCursor>;
    if (
      typeof parsed.id === "string" &&
      typeof parsed.rank === "number" &&
      Number.isFinite(parsed.rank)
    ) {
      return { id: parsed.id, rank: parsed.rank };
    }
  } catch {
    // Fall through to a shaped validation error.
  }
  throw new BadRequestException({
    error: {
      code: ErrorCode.VALIDATION_FAILED,
      message: "Invalid search cursor.",
    },
  });
}
