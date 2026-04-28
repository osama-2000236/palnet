import type { Post as PostDto } from "@baydar/shared";

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
}

export function toPostDto(post: PostWithIncludes): PostDto {
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
    },
    viewer: {
      reaction: post.reactions[0]?.type ?? null,
      reposted: post.reposts.length > 0,
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
export function postInclude(viewerId: string) {
  return {
    author: {
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
    media: true,
    _count: {
      select: { reactions: true, comments: true, reposts: true },
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
  } as const;
}
