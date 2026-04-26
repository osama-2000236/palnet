import type {
  CursorPageMeta,
  PeopleSearchQuery,
  SearchPersonHit,
} from "@baydar/shared";
import { Injectable } from "@nestjs/common";

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
}

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async people(
    query: PeopleSearchQuery,
  ): Promise<{ data: SearchPersonHit[]; meta: CursorPageMeta }> {
    const q = query.q.trim();
    const limit = query.limit;

    // Substring match across handle/firstName/lastName/headline. Postgres
    // `mode: "insensitive"` keeps us case-insensitive without needing
    // trigram/fts indexes yet; we'll layer GIN FTS in a later sprint.
    const where = {
      OR: [
        { handle: { contains: q, mode: "insensitive" as const } },
        { firstName: { contains: q, mode: "insensitive" as const } },
        { lastName: { contains: q, mode: "insensitive" as const } },
        { headline: { contains: q, mode: "insensitive" as const } },
      ],
    };

    const rows = (await this.prisma.profile.findMany({
      where,
      orderBy: [{ handle: "asc" }, { id: "asc" }],
      take: limit + 1,
      ...(query.after
        ? { cursor: { id: query.after }, skip: 1 }
        : {}),
      select: {
        id: true,
        userId: true,
        handle: true,
        firstName: true,
        lastName: true,
        headline: true,
        location: true,
        avatarUrl: true,
      },
    })) as unknown as ProfileSearchRow[];

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
