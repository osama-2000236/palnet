import type {
  CursorPageMeta,
  JobsSearchQuery,
  PeopleSearchQuery,
  PostsSearchQuery,
  SearchJobHit,
  SearchPersonHit,
  SearchPostHit,
} from "@baydar/shared";
import { Injectable } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";
import { SafetyService } from "../safety/safety.service";

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

interface PostSearchRow {
  id: string;
  authorId: string;
  body: string;
  createdAt: Date;
  author: {
    deletedAt: Date | null;
    profile: {
      handle: string;
      firstName: string;
      lastName: string;
      avatarUrl: string | null;
    } | null;
  };
}

interface JobSearchRow {
  id: string;
  title: string;
  type: SearchJobHit["type"];
  locationMode: SearchJobHit["locationMode"];
  city: string | null;
  country: string;
  createdAt: Date;
  company: {
    name: string;
    logoUrl: string | null;
  };
}

@Injectable()
export class SearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly safety: SafetyService,
  ) {}

  async people(
    viewerId: string,
    query: PeopleSearchQuery,
  ): Promise<{ data: SearchPersonHit[]; meta: CursorPageMeta }> {
    const q = query.q.trim();
    const limit = query.limit;
    const excludedUserIds = await this.safety.getBlockedEitherIds(viewerId);

    // Substring match across handle/firstName/lastName/headline. Postgres
    // `mode: "insensitive"` keeps us case-insensitive without needing
    // trigram/fts indexes yet; we'll layer GIN FTS in a later sprint.
    const where = {
      ...(excludedUserIds.length ? { userId: { notIn: excludedUserIds } } : {}),
      user: { deletedAt: null },
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
      ...(query.after ? { cursor: { id: query.after }, skip: 1 } : {}),
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

  async searchPosts(
    viewerId: string,
    query: PostsSearchQuery,
  ): Promise<{ data: SearchPostHit[]; meta: CursorPageMeta }> {
    const q = query.q.trim();
    const limit = query.limit;
    const excludedUserIds = await this.safety.getBlockedEitherIds(viewerId);

    const rows = (await this.prisma.post.findMany({
      where: {
        body: { contains: q, mode: "insensitive" as const },
        deletedAt: null,
        ...(excludedUserIds.length ? { authorId: { notIn: excludedUserIds } } : {}),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(query.after ? { cursor: { id: query.after }, skip: 1 } : {}),
      select: {
        id: true,
        authorId: true,
        body: true,
        createdAt: true,
        author: {
          select: {
            profile: {
              select: {
                handle: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
              },
            },
            deletedAt: true,
          },
        },
      },
    })) as unknown as PostSearchRow[];

    const hasMore = rows.length > limit;
    const trimmed = hasMore ? rows.slice(0, limit) : rows;

    return {
      data: trimmed.map((p) => toPostHit(p, q)),
      meta: {
        nextCursor: hasMore ? trimmed[trimmed.length - 1]!.id : null,
        hasMore,
        limit,
      },
    };
  }

  async searchJobs(
    _viewerId: string,
    query: JobsSearchQuery,
  ): Promise<{ data: SearchJobHit[]; meta: CursorPageMeta }> {
    const q = query.q.trim();
    const limit = query.limit;
    const now = new Date();

    const rows = (await this.prisma.job.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        AND: [
          {
            OR: [
              { title: { contains: q, mode: "insensitive" as const } },
              { description: { contains: q, mode: "insensitive" as const } },
            ],
          },
          { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
        ],
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(query.after ? { cursor: { id: query.after }, skip: 1 } : {}),
      select: {
        id: true,
        title: true,
        type: true,
        locationMode: true,
        city: true,
        country: true,
        createdAt: true,
        company: { select: { name: true, logoUrl: true } },
      },
    })) as unknown as JobSearchRow[];

    const hasMore = rows.length > limit;
    const trimmed = hasMore ? rows.slice(0, limit) : rows;

    return {
      data: trimmed.map<SearchJobHit>((j) => ({
        id: j.id,
        title: j.title,
        companyName: j.company.name,
        companyLogoUrl: j.company.logoUrl,
        locationMode: j.locationMode,
        city: j.city,
        country: j.country,
        type: j.type,
        createdAt: j.createdAt.toISOString(),
      })),
      meta: {
        nextCursor: hasMore ? trimmed[trimmed.length - 1]!.id : null,
        hasMore,
        limit,
      },
    };
  }
}

function toPostHit(row: PostSearchRow, q: string): SearchPostHit {
  const profile = row.author.profile;
  if (row.author.deletedAt) {
    const excerpt = buildExcerpt(row.body, q);
    return {
      id: row.id,
      authorId: row.authorId,
      authorHandle: row.authorId,
      authorDisplayName: "Deleted user",
      authorAvatarUrl: null,
      bodyExcerpt: excerpt.text,
      matchStart: excerpt.matchStart,
      matchEnd: excerpt.matchEnd,
      createdAt: row.createdAt.toISOString(),
    };
  }
  const displayName = profile ? `${profile.firstName} ${profile.lastName}`.trim() : "Baydar user";
  const excerpt = buildExcerpt(row.body, q);
  return {
    id: row.id,
    authorId: row.authorId,
    authorHandle: profile?.handle ?? row.authorId,
    authorDisplayName: displayName,
    authorAvatarUrl: profile?.avatarUrl ?? null,
    bodyExcerpt: excerpt.text,
    matchStart: excerpt.matchStart,
    matchEnd: excerpt.matchEnd,
    createdAt: row.createdAt.toISOString(),
  };
}

function buildExcerpt(
  body: string,
  q: string,
): { text: string; matchStart: number | null; matchEnd: number | null } {
  const normalizedBody = body.replace(/\s+/g, " ").trim();
  const matchIndex = normalizedBody.toLowerCase().indexOf(q.toLowerCase());
  if (normalizedBody.length <= 220) {
    return {
      text: normalizedBody,
      matchStart: matchIndex >= 0 ? matchIndex : null,
      matchEnd: matchIndex >= 0 ? matchIndex + q.length : null,
    };
  }

  const start = Math.max(0, matchIndex >= 0 ? matchIndex - 80 : 0);
  const end = Math.min(normalizedBody.length, start + 220);
  const prefix = start > 0 ? "..." : "";
  const suffix = end < normalizedBody.length ? "..." : "";
  const text = `${prefix}${normalizedBody.slice(start, end)}${suffix}`;
  const offset = prefix.length - start;

  return {
    text,
    matchStart: matchIndex >= 0 ? matchIndex + offset : null,
    matchEnd: matchIndex >= 0 ? matchIndex + q.length + offset : null,
  };
}
