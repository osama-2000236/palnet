import {
  BookmarkType,
  ErrorCode,
  jobSource,
  type Bookmark as BookmarkDto,
  type CreateBookmarkBody,
  type CursorPageMeta,
  type JobLocationMode,
  type JobType,
} from "@baydar/shared";
import { Injectable } from "@nestjs/common";

import { DomainException } from "../../common/domain-exception";
import { PrismaService } from "../prisma/prisma.service";

interface BookmarkRow {
  id: string;
  userId: string;
  type: BookmarkDto["type"];
  postId: string | null;
  jobId: string | null;
  createdAt: Date;
  post: {
    id: string;
    body: string;
    author: {
      deletedAt: Date | null;
      profile: {
        handle: string;
        firstName: string;
        lastName: string;
        avatarUrl: string | null;
      } | null;
    };
  } | null;
  job: {
    id: string;
    title: string;
    city: string | null;
    locationMode: JobLocationMode;
    type: JobType;
    // Null for individual-posted work. The rows here are read through an
    // `as unknown as` cast, so this shape is the only thing standing between a
    // nullable column and a null-deref at render time — keep it honest.
    company: {
      id: string;
      slug: string;
      name: string;
      logoUrl: string | null;
    } | null;
    postedBy: {
      profile: {
        handle: string;
        firstName: string;
        lastName: string;
        avatarUrl: string | null;
      } | null;
    };
  } | null;
}

const bookmarkInclude = {
  post: {
    select: {
      id: true,
      body: true,
      author: {
        select: {
          deletedAt: true,
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
  },
  job: {
    select: {
      id: true,
      title: true,
      city: true,
      locationMode: true,
      type: true,
      company: {
        select: {
          id: true,
          slug: true,
          name: true,
          logoUrl: true,
        },
      },
      postedBy: {
        select: {
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
  },
} as const;

@Injectable()
export class BookmarksService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    userId: string,
    query: { after: string | null; limit: number; type: BookmarkDto["type"] | null },
  ): Promise<{ data: BookmarkDto[]; meta: CursorPageMeta }> {
    const rows = (await this.prisma.bookmark.findMany({
      where: {
        userId,
        ...(query.type ? { type: query.type } : {}),
        OR: [
          {
            type: BookmarkType.POST,
            post: { is: { deletedAt: null, author: { deletedAt: null } } },
          },
          {
            type: BookmarkType.JOB,
            job: { is: { deletedAt: null, isActive: true } },
          },
        ],
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: query.limit + 1,
      ...(query.after ? { cursor: { id: query.after }, skip: 1 } : {}),
      include: bookmarkInclude,
    })) as unknown as BookmarkRow[];

    const hasMore = rows.length > query.limit;
    const trimmed = hasMore ? rows.slice(0, query.limit) : rows;

    return {
      data: trimmed.map(toBookmarkDto),
      meta: {
        nextCursor: hasMore ? trimmed[trimmed.length - 1]!.id : null,
        hasMore,
        limit: query.limit,
      },
    };
  }

  async create(userId: string, body: CreateBookmarkBody): Promise<BookmarkDto> {
    if (body.type === BookmarkType.POST) {
      return this.createPostBookmark(userId, body.targetId);
    }
    return this.createJobBookmark(userId, body.targetId);
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.prisma.bookmark.deleteMany({ where: { id, userId } });
  }

  private async createPostBookmark(userId: string, postId: string): Promise<BookmarkDto> {
    const post = await this.prisma.post.findFirst({
      where: { id: postId, deletedAt: null, author: { deletedAt: null } },
      select: { id: true },
    });
    if (!post) throw new DomainException(ErrorCode.NOT_FOUND, "Post not found.", 404);

    const existing = await this.findExisting(userId, BookmarkType.POST, postId);
    if (existing) return toBookmarkDto(existing);

    try {
      const row = (await this.prisma.bookmark.create({
        data: { userId, type: BookmarkType.POST, postId },
        include: bookmarkInclude,
      })) as unknown as BookmarkRow;
      return toBookmarkDto(row);
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      const raced = await this.findExisting(userId, BookmarkType.POST, postId);
      if (raced) return toBookmarkDto(raced);
      throw error;
    }
  }

  private async createJobBookmark(userId: string, jobId: string): Promise<BookmarkDto> {
    const job = await this.prisma.job.findFirst({
      where: { id: jobId, deletedAt: null, isActive: true },
      select: { id: true },
    });
    if (!job) throw new DomainException(ErrorCode.NOT_FOUND, "Job not found.", 404);

    const existing = await this.findExisting(userId, BookmarkType.JOB, jobId);
    if (existing) return toBookmarkDto(existing);

    try {
      const row = (await this.prisma.bookmark.create({
        data: { userId, type: BookmarkType.JOB, jobId },
        include: bookmarkInclude,
      })) as unknown as BookmarkRow;
      return toBookmarkDto(row);
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      const raced = await this.findExisting(userId, BookmarkType.JOB, jobId);
      if (raced) return toBookmarkDto(raced);
      throw error;
    }
  }

  private async findExisting(
    userId: string,
    type: BookmarkDto["type"],
    targetId: string,
  ): Promise<BookmarkRow | null> {
    return (await this.prisma.bookmark.findFirst({
      where:
        type === BookmarkType.POST
          ? { userId, type, postId: targetId }
          : { userId, type, jobId: targetId },
      include: bookmarkInclude,
    })) as unknown as BookmarkRow | null;
  }
}

function toBookmarkDto(row: BookmarkRow): BookmarkDto {
  if (row.type === BookmarkType.POST && row.post) {
    const profile = row.post.author.profile;
    const name =
      profile && `${profile.firstName} ${profile.lastName}`.trim()
        ? `${profile.firstName} ${profile.lastName}`.trim()
        : (profile?.handle ?? "Baydar member");

    return {
      id: row.id,
      type: row.type,
      targetId: row.post.id,
      title: name,
      // No subtitle: the client already renders a localized type label
      // ("منشور"), and a hardcoded English "Post" shipped straight through it.
      subtitle: null,
      description: excerpt(row.post.body),
      href: `/feed?postId=${row.post.id}`,
      imageUrl: profile?.avatarUrl ?? null,
      savedAt: row.createdAt.toISOString(),
      jobMeta: null,
    };
  }

  if (row.type === BookmarkType.JOB && row.job) {
    // The business if there is one, else the person who posted it. Shared with
    // web and mobile so a saved individual-posted job reads the same everywhere.
    const source = jobSource({
      company: row.job.company,
      poster: {
        handle: row.job.postedBy.profile?.handle ?? "",
        firstName: row.job.postedBy.profile?.firstName ?? "",
        lastName: row.job.postedBy.profile?.lastName ?? "",
        avatarUrl: row.job.postedBy.profile?.avatarUrl ?? null,
      },
    });
    return {
      id: row.id,
      type: row.type,
      targetId: row.job.id,
      title: row.job.title,
      subtitle: source.name,
      // Enums stay enums here — the client owns their Arabic labels.
      description: null,
      href: `/jobs/${row.job.id}`,
      imageUrl: source.imageUrl,
      savedAt: row.createdAt.toISOString(),
      jobMeta: {
        city: row.job.city,
        locationMode: row.job.locationMode,
        type: row.job.type,
      },
    };
  }

  throw new Error(`Bookmark ${row.id} points at a missing target.`);
}

function excerpt(value: string): string | null {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) return null;
  return normalized.length > 180 ? `${normalized.slice(0, 177)}...` : normalized;
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" && error !== null && (error as { code?: unknown }).code === "P2002"
  );
}
