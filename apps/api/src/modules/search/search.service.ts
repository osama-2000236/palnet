import { Prisma } from "@baydar/db";
import type {
  CompaniesSearchQuery,
  CursorPageMeta,
  JobsSearchQuery,
  PeopleSearchQuery,
  PostsSearchQuery,
  SearchCompanyHit,
  SearchJobHit,
  SearchPersonHit,
  SearchPostHit,
} from "@baydar/shared";
import { Injectable } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";
import { SafetyService } from "../safety/safety.service";

// Raw rows returned by the $queryRaw helpers below. Mirrors the shape the
// previous Prisma `findMany` calls produced so the downstream mappers stay
// untouched.
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
  authorDeletedAt: Date | null;
  authorHandle: string | null;
  authorFirstName: string | null;
  authorLastName: string | null;
  authorAvatarUrl: string | null;
}

interface CompanySearchRow {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  industry: string | null;
  city: string | null;
  country: string;
  logoUrl: string | null;
  verified: boolean;
  activeJobs: bigint | number;
}

interface JobSearchRow {
  id: string;
  title: string;
  type: SearchJobHit["type"];
  locationMode: SearchJobHit["locationMode"];
  city: string | null;
  country: string;
  createdAt: Date;
  companyName: string;
  companyLogoUrl: string | null;
}

interface CompanySearchRow {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  industry: string | null;
  city: string | null;
  country: string;
  logoUrl: string | null;
  verified: boolean;
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

    // Cursor: paginate by (handle ASC, id ASC). When a cursor id is given we
    // look up its handle so the SQL keyset condition can apply.
    const cursorRow = query.after
      ? await this.prisma.profile.findUnique({
          where: { id: query.after },
          select: { handle: true, id: true },
        })
      : null;

    const excludedClause = excludedUserIds.length
      ? Prisma.sql`AND p."userId" NOT IN (${Prisma.join(excludedUserIds)})`
      : Prisma.empty;
    const cursorClause = cursorRow
      ? Prisma.sql`AND (p."handle", p."id") > (${cursorRow.handle}, ${cursorRow.id})`
      : Prisma.empty;

    const rows = await this.prisma.$queryRaw<ProfileSearchRow[]>(Prisma.sql`
      SELECT
        p."id"        AS "id",
        p."userId"    AS "userId",
        p."handle"    AS "handle",
        p."firstName" AS "firstName",
        p."lastName"  AS "lastName",
        p."headline"  AS "headline",
        p."location"  AS "location",
        p."avatarUrl" AS "avatarUrl"
      FROM   "Profile" p
      JOIN   "User"    u ON u."id" = p."userId"
      WHERE  u."deletedAt" IS NULL
        AND  to_tsvector(
               'simple',
               COALESCE(p."handle",    '') || ' ' ||
               COALESCE(p."firstName", '') || ' ' ||
               COALESCE(p."lastName",  '') || ' ' ||
               COALESCE(p."headline",  '')
             ) @@ plainto_tsquery('simple', ${q})
        ${excludedClause}
        ${cursorClause}
      ORDER  BY p."handle" ASC, p."id" ASC
      LIMIT  ${limit + 1}
    `);

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

    const cursorRow = query.after
      ? await this.prisma.post.findUnique({
          where: { id: query.after },
          select: { createdAt: true, id: true },
        })
      : null;

    const excludedClause = excludedUserIds.length
      ? Prisma.sql`AND po."authorId" NOT IN (${Prisma.join(excludedUserIds)})`
      : Prisma.empty;
    // Posts are ordered DESC, so a "next page" condition is strictly LESS THAN.
    const cursorClause = cursorRow
      ? Prisma.sql`AND (po."createdAt", po."id") < (${cursorRow.createdAt}, ${cursorRow.id})`
      : Prisma.empty;

    const rows = await this.prisma.$queryRaw<PostSearchRow[]>(Prisma.sql`
      SELECT
        po."id"          AS "id",
        po."authorId"    AS "authorId",
        po."body"        AS "body",
        po."createdAt"   AS "createdAt",
        au."deletedAt"   AS "authorDeletedAt",
        pr."handle"      AS "authorHandle",
        pr."firstName"   AS "authorFirstName",
        pr."lastName"    AS "authorLastName",
        pr."avatarUrl"   AS "authorAvatarUrl"
      FROM   "Post"    po
      JOIN   "User"    au ON au."id"     = po."authorId"
      LEFT JOIN "Profile" pr ON pr."userId" = au."id"
      WHERE  po."deletedAt" IS NULL
        AND  au."deletedAt" IS NULL
        AND  to_tsvector('simple', COALESCE(po."body", '')) @@ plainto_tsquery('simple', ${q})
        ${excludedClause}
        ${cursorClause}
      ORDER  BY po."createdAt" DESC, po."id" DESC
      LIMIT  ${limit + 1}
    `);

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

  async searchCompanies(
    _viewerId: string,
    query: CompaniesSearchQuery,
  ): Promise<{ data: SearchCompanyHit[]; meta: CursorPageMeta }> {
    const q = query.q.trim();
    const limit = query.limit;
    const now = new Date();

    const cursorRow = query.after
      ? await this.prisma.company.findUnique({
          where: { id: query.after },
          select: { name: true, id: true },
        })
      : null;

    const cursorClause = cursorRow
      ? Prisma.sql`AND (c."name", c."id") > (${cursorRow.name}, ${cursorRow.id})`
      : Prisma.empty;

    const rows = await this.prisma.$queryRaw<CompanySearchRow[]>(Prisma.sql`
      SELECT
        c."id"       AS "id",
        c."slug"     AS "slug",
        c."name"     AS "name",
        c."tagline"  AS "tagline",
        c."industry" AS "industry",
        c."city"     AS "city",
        c."country"  AS "country",
        c."logoUrl"  AS "logoUrl",
        c."verified" AS "verified",
        (
          SELECT COUNT(*)
          FROM   "Job" j
          WHERE  j."companyId" = c."id"
            AND  j."isActive"  = TRUE
            AND  j."deletedAt" IS NULL
            AND  (j."expiresAt" IS NULL OR j."expiresAt" > ${now})
        ) AS "activeJobs"
      FROM   "Company" c
      WHERE  to_tsvector(
               'simple',
               COALESCE(c."name",     '') || ' ' ||
               COALESCE(c."slug",     '') || ' ' ||
               COALESCE(c."tagline",  '') || ' ' ||
               COALESCE(c."industry", '')
             ) @@ plainto_tsquery('simple', ${q})
        ${cursorClause}
      ORDER  BY c."name" ASC, c."id" ASC
      LIMIT  ${limit + 1}
    `);

    const hasMore = rows.length > limit;
    const trimmed = hasMore ? rows.slice(0, limit) : rows;

    return {
      data: trimmed.map<SearchCompanyHit>((c) => ({
        id: c.id,
        slug: c.slug,
        name: c.name,
        tagline: c.tagline,
        industry: c.industry,
        city: c.city,
        country: c.country,
        logoUrl: c.logoUrl,
        verified: c.verified,
        activeJobs: Number(c.activeJobs),
      })),
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

    const cursorRow = query.after
      ? await this.prisma.job.findUnique({
          where: { id: query.after },
          select: { createdAt: true, id: true },
        })
      : null;

    const cursorClause = cursorRow
      ? Prisma.sql`AND (j."createdAt", j."id") < (${cursorRow.createdAt}, ${cursorRow.id})`
      : Prisma.empty;

    const rows = await this.prisma.$queryRaw<JobSearchRow[]>(Prisma.sql`
      SELECT
        j."id"           AS "id",
        j."title"        AS "title",
        j."type"         AS "type",
        j."locationMode" AS "locationMode",
        j."city"         AS "city",
        j."country"      AS "country",
        j."createdAt"    AS "createdAt",
        c."name"         AS "companyName",
        c."logoUrl"      AS "companyLogoUrl"
      FROM   "Job"     j
      JOIN   "Company" c ON c."id" = j."companyId"
      WHERE  j."isActive"  = TRUE
        AND  j."deletedAt" IS NULL
        AND  (j."expiresAt" IS NULL OR j."expiresAt" > ${now})
        AND  to_tsvector(
               'simple',
               COALESCE(j."title",       '') || ' ' ||
               COALESCE(j."description", '')
             ) @@ plainto_tsquery('simple', ${q})
        ${cursorClause}
      ORDER  BY j."createdAt" DESC, j."id" DESC
      LIMIT  ${limit + 1}
    `);

    const hasMore = rows.length > limit;
    const trimmed = hasMore ? rows.slice(0, limit) : rows;

    return {
      data: trimmed.map<SearchJobHit>((j) => ({
        id: j.id,
        title: j.title,
        companyName: j.companyName,
        companyLogoUrl: j.companyLogoUrl,
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
  const excerpt = buildExcerpt(row.body, q);
  if (row.authorDeletedAt) {
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
  const displayName =
    row.authorFirstName || row.authorLastName
      ? `${row.authorFirstName ?? ""} ${row.authorLastName ?? ""}`.trim()
      : "Baydar user";
  return {
    id: row.id,
    authorId: row.authorId,
    authorHandle: row.authorHandle ?? row.authorId,
    authorDisplayName: displayName,
    authorAvatarUrl: row.authorAvatarUrl,
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
