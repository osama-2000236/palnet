import {
  avatarUrlFor,
  postImageUrlFor,
  type ConnectionClass,
  type Post as PostDto,
} from "@baydar/shared";

// Prisma post with includes we count on everywhere.
export interface PostWithIncludes {
  id: string;
  authorId: string;
  body: string;
  language: string;
  createdAt: Date;
  updatedAt: Date;
  author: {
    id: string;
    deletedAt: Date | null;
    profile: {
      handle: string;
      firstName: string;
      lastName: string;
      headline: string | null;
      avatarUrl: string | null;
    } | null;
  };
  media: Array<{
    id: string;
    url: string;
    kind: "IMAGE" | "VIDEO" | "DOCUMENT";
    mimeType: string;
    width: number | null;
    height: number | null;
    durationMs: number | null;
    sizeBytes: number | null;
    blurhash: string | null;
  }>;
  _count: {
    reactions: number;
    comments: number;
    reposts: number;
  };
  reactions: Array<{ type: string }>; // scoped to viewer (take: 1)
  reposts: Array<{ id: string }>; // scoped to viewer (take: 1)
  bookmarks: Array<{ id: string }>; // scoped to viewer (take: 1)
  // Attached by `attachReactionBreakdown` after the page query, not by the
  // Prisma include — an include cannot group, and the alternative (six filtered
  // `_count` selects) is six correlated subqueries per post where one grouped
  // query per page does the whole job.
  reactionBreakdown?: Record<string, number>;
}

/**
 * One `groupBy` for a whole page of posts, folded back onto each row. Callers
 * that skip it get `byReaction: {}` and the clients fall back to the generic
 * mark, so this is an enrichment rather than a contract every call site must
 * honour.
 */
export async function attachReactionBreakdown<T extends { id: string }>(
  prisma: {
    reaction: {
      groupBy(args: unknown): Promise<Array<{ postId: string; type: string; _count: number }>>;
    };
  },
  posts: T[],
  excludedUserIds: string[] = [],
): Promise<Array<T & { reactionBreakdown: Record<string, number> }>> {
  if (posts.length === 0) return [];
  const rows = await prisma.reaction.groupBy({
    by: ["postId", "type"],
    where: {
      postId: { in: posts.map((p) => p.id) },
      ...(excludedUserIds.length ? { userId: { notIn: excludedUserIds } } : {}),
    },
    _count: true,
  });
  const byPost = new Map<string, Record<string, number>>();
  for (const row of rows) {
    const bucket = byPost.get(row.postId) ?? {};
    bucket[row.type] = row._count;
    byPost.set(row.postId, bucket);
  }
  return posts.map((post) => ({ ...post, reactionBreakdown: byPost.get(post.id) ?? {} }));
}

/**
 * Rewrite the images in one post for the connection that asked for it.
 *
 * Applied here, at the last step before the wire, so no call site can hand a
 * member on 2G a 1080px URL — §15.3 puts this decision on the server precisely
 * so the two clients need no bandwidth store and no way to opt back up.
 *
 * Video is left alone: it is never autoplayed, the client draws a poster and a
 * play affordance, and there is no transcoding pipeline to make variants of.
 */
export function withImageVariants(
  post: PostDto,
  connection: ConnectionClass,
  transformBase: string | null | undefined,
): PostDto {
  return {
    ...post,
    media: post.media.map((m) =>
      m.kind === "IMAGE"
        ? { ...m, url: postImageUrlFor(m.url, connection, transformBase) ?? m.url }
        : m,
    ),
    author: {
      ...post.author,
      avatarUrl: avatarUrlFor(post.author.avatarUrl, connection, transformBase),
    },
  };
}

export function toPostDto(post: PostWithIncludes): PostDto {
  if (post.author.deletedAt) {
    return {
      id: post.id,
      authorId: post.authorId,
      body: post.body,
      language: post.language,
      media: post.media.map((m) => ({
        id: m.id,
        url: m.url,
        kind: m.kind,
        mimeType: m.mimeType,
        width: m.width,
        height: m.height,
        durationMs: m.durationMs,
        sizeBytes: m.sizeBytes,
        blurhash: m.blurhash,
      })),
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
      counts: {
        reactions: post._count.reactions,
        comments: post._count.comments,
        reposts: post._count.reposts,
        byReaction: post.reactionBreakdown ?? {},
      },
      viewer: {
        reaction: post.reactions[0]?.type ?? null,
        reposted: post.reposts.length > 0,
        bookmarkId: post.bookmarks[0]?.id ?? null,
      },
      author: {
        id: post.author.id,
        handle: post.author.id,
        firstName: "Deleted user",
        lastName: "",
        headline: null,
        avatarUrl: null,
      },
    };
  }

  if (!post.author.profile) {
    throw new Error(
      `Post ${post.id} has an author without a profile; this is a data invariant bug.`,
    );
  }

  return {
    id: post.id,
    authorId: post.authorId,
    body: post.body,
    language: post.language,
    media: post.media.map((m) => ({
      id: m.id,
      url: m.url,
      kind: m.kind,
      mimeType: m.mimeType,
      width: m.width,
      height: m.height,
      durationMs: m.durationMs,
      sizeBytes: m.sizeBytes,
      blurhash: m.blurhash,
    })),
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    counts: {
      reactions: post._count.reactions,
      comments: post._count.comments,
      reposts: post._count.reposts,
      byReaction: post.reactionBreakdown ?? {},
    },
    viewer: {
      reaction: post.reactions[0]?.type ?? null,
      reposted: post.reposts.length > 0,
      bookmarkId: post.bookmarks[0]?.id ?? null,
    },
    author: {
      id: post.author.id,
      handle: post.author.profile.handle,
      firstName: post.author.profile.firstName,
      lastName: post.author.profile.lastName,
      headline: post.author.profile.headline,
      avatarUrl: post.author.profile.avatarUrl,
    },
  };
}

// Standard `include` shape for Prisma post queries. Call-sites override where needed.
export function postInclude(viewerId: string, excludedUserIds: string[] = []) {
  const visibleUserWhere = excludedUserIds.length ? { userId: { notIn: excludedUserIds } } : {};
  const visibleAuthorWhere = excludedUserIds.length ? { authorId: { notIn: excludedUserIds } } : {};

  return {
    author: {
      select: {
        id: true,
        deletedAt: true,
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
    media: true,
    _count: {
      select: {
        reactions: { where: visibleUserWhere },
        comments: { where: { deletedAt: null, ...visibleAuthorWhere } },
        reposts: { where: visibleUserWhere },
      },
    },
    reactions: {
      where: { userId: viewerId },
      take: 1,
      select: { type: true },
    },
    reposts: {
      where: { userId: viewerId },
      take: 1,
      select: { id: true },
    },
    bookmarks: {
      where: { userId: viewerId },
      take: 1,
      select: { id: true },
    },
  } as const;
}
