import { Prisma } from "@baydar/db";
import { followTargetKey } from "@baydar/shared";

/**
 * A connection is two follows, and this is where that is written down.
 *
 * Kept beside `ConnectionsService` rather than inside `FollowsService`: this is
 * a rule about connections, and the follow service should not have to know that
 * connections exist. Both halves take a transaction client, because a
 * connection that accepted without its follows leaves a member staring at an
 * empty feed with nothing to blame.
 */

/**
 * Prisma's own transaction client.
 *
 * A hand-written structural interface was the first attempt and does not
 * typecheck against Prisma's generics — `createMany` is generic over its own
 * args type, so a `Record<string, unknown>` signature is not assignable. The
 * real type is also the honest one: these functions run inside a transaction
 * and nowhere else.
 */
export type FollowWriter = Prisma.TransactionClient;

const keyFor = (targetUserId: string): string =>
  followTargetKey({ targetType: "USER", targetUserId });

/**
 * One direction at a time, deliberately.
 *
 * `createMany` reports how many rows it wrote but not which, and one of the two
 * follows often exists already — somebody who found you first and asked to
 * connect second is a very ordinary order of events. Doing each side on its own
 * is one extra round trip inside a transaction that is already open, and it
 * buys a counter that is exactly right instead of one the nightly job has to
 * repair.
 */
async function followOneWay(
  tx: FollowWriter,
  followerId: string,
  targetUserId: string,
): Promise<void> {
  const targetKey = keyFor(targetUserId);
  const created = await tx.follow.createMany({
    data: [{ followerId, targetType: "USER", targetUserId, targetKey }],
    skipDuplicates: true,
  });
  if (created.count === 0) return;

  await tx.followerCount.upsert({
    where: { targetKey },
    create: { targetKey, targetType: "USER", count: 1 },
    update: { count: { increment: 1 } },
  });
}

async function unfollowOneWay(
  tx: FollowWriter,
  followerId: string,
  targetUserId: string,
): Promise<void> {
  const targetKey = keyFor(targetUserId);
  const removed = await tx.follow.deleteMany({ where: { followerId, targetKey } });
  if (removed.count === 0) return;

  // Guarded by the row's own value: the table has CHECK (count >= 0), and a
  // disconnect that threw because a counter had drifted would turn a
  // background problem into one the member sees.
  await tx.followerCount.updateMany({
    where: { targetKey, count: { gt: 0 } },
    data: { count: { decrement: 1 } },
  });
}

/** Accepting a connection: each side follows the other. */
export async function addMutualFollows(tx: FollowWriter, a: string, b: string): Promise<void> {
  await followOneWay(tx, a, b);
  await followOneWay(tx, b, a);
}

/**
 * Disconnecting: both follows go.
 *
 * The reverse is not true — unfollowing does not disconnect. "I no longer want
 * your posts" and "we are no longer connected" are different statements, and
 * only the second one is visible to the other person.
 */
export async function removeMutualFollows(tx: FollowWriter, a: string, b: string): Promise<void> {
  await unfollowOneWay(tx, a, b);
  await unfollowOneWay(tx, b, a);
}
