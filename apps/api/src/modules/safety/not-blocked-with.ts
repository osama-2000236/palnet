import type { Prisma } from "@baydar/db";

/**
 * A user who has not blocked `viewerId` and whom `viewerId` has not blocked,
 * as a relation filter. Put it on the author of the thing being read or
 * written so the block check rides the same query instead of a second round
 * trip — the feed and post page already hid blocked authors, but comment,
 * react, repost, endorse and the profile page looked rows up without it.
 */
export function notBlockedWith(viewerId: string): Prisma.UserWhereInput {
  return {
    blockedByMe: { none: { blockedId: viewerId } },
    blockedMe: { none: { blockerId: viewerId } },
  };
}
