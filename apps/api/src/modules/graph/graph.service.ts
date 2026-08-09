import {
  ErrorCode,
  type DegreeBadge,
  type FollowPerson,
  type MutualConnections,
} from "@baydar/shared";
import { Injectable } from "@nestjs/common";

import { DomainException } from "../../common/domain-exception";
import { PrismaService } from "../prisma/prisma.service";

/**
 * The quiet half of the graph: mute, restrict, and how far away somebody is.
 *
 * Muting and restricting are both "less than a block", and the difference
 * matters. A mute is invisible to the other person and only affects the feed.
 * A restriction is the primitive for the case where blocking is itself a
 * signal somebody would notice and react to — they can still see you, they
 * simply cannot reach you.
 */
@Injectable()
export class GraphService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Feed mutes ───────────────────────────────────────────────────────────

  /** Stop showing me their posts. Does not unfollow and does not disconnect. */
  async mute(userId: string, mutedId: string): Promise<void> {
    if (userId === mutedId) {
      throw new DomainException(ErrorCode.CONNECTION_SELF, "You cannot mute yourself.", 400);
    }
    await this.prisma.feedMute.createMany({ data: [{ userId, mutedId }], skipDuplicates: true });
  }

  async unmute(userId: string, mutedId: string): Promise<void> {
    await this.prisma.feedMute.deleteMany({ where: { userId, mutedId } });
  }

  async listMutes(userId: string): Promise<FollowPerson[]> {
    const rows = await this.prisma.feedMute.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { muted: { select: PERSON } },
    });
    return rows.map((row) => toPerson(row.muted)).filter((p): p is FollowPerson => p !== null);
  }

  /** Everyone this viewer has muted. Used by the feed query. */
  async mutedIds(userId: string): Promise<string[]> {
    const rows = await this.prisma.feedMute.findMany({
      where: { userId },
      select: { mutedId: true },
    });
    return rows.map((row) => row.mutedId);
  }

  // ── Restrictions ─────────────────────────────────────────────────────────

  async restrict(userId: string, restrictedId: string): Promise<void> {
    if (userId === restrictedId) {
      throw new DomainException(ErrorCode.CONNECTION_SELF, "You cannot restrict yourself.", 400);
    }
    await this.prisma.restrictedUser.createMany({
      data: [{ userId, restrictedId }],
      skipDuplicates: true,
    });
  }

  async unrestrict(userId: string, restrictedId: string): Promise<void> {
    await this.prisma.restrictedUser.deleteMany({ where: { userId, restrictedId } });
  }

  async listRestrictions(userId: string): Promise<FollowPerson[]> {
    const rows = await this.prisma.restrictedUser.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { restricted: { select: PERSON } },
    });
    return rows.map((row) => toPerson(row.restricted)).filter((p): p is FollowPerson => p !== null);
  }

  /**
   * Can `actor` message or comment at `owner`?
   *
   * Checked one way only, deliberately: a restriction is not mutual. The owner
   * restricted them; the owner can still reach out, which is the point of
   * having something short of a block.
   */
  async isRestricted(ownerId: string, actorId: string): Promise<boolean> {
    const found = await this.prisma.restrictedUser.count({
      where: { userId: ownerId, restrictedId: actorId },
    });
    return found > 0;
  }

  // ── Degree and mutuals ───────────────────────────────────────────────────

  /**
   * How far away one person is from another.
   *
   * First degree is a live lookup because it must be exact — a card that says
   * "2nd" about somebody you connected with an hour ago is wrong in a way
   * members notice. Second degree comes from the nightly table, because live
   * it is a two-hop join per card, which at feed scale is not affordable.
   * Everything else is "3rd+" without proof.
   */
  async degreeOf(
    viewerId: string,
    otherId: string,
  ): Promise<{ degree: DegreeBadge; mutuals: number }> {
    if (viewerId === otherId) return { degree: "self", mutuals: 0 };

    const connected = await this.prisma.connection.count({
      where: {
        status: "ACCEPTED",
        OR: [
          { requesterId: viewerId, receiverId: otherId },
          { requesterId: otherId, receiverId: viewerId },
        ],
      },
    });
    if (connected > 0) return { degree: "1st", mutuals: 0 };

    const second = await this.prisma.secondDegree.findUnique({
      where: { userId_peerId: { userId: viewerId, peerId: otherId } },
      select: { mutuals: true },
    });
    return second ? { degree: "2nd", mutuals: second.mutuals } : { degree: "3rd+", mutuals: 0 };
  }

  /**
   * Degree and mutual count for a page of people, in two queries rather than
   * two per person. A feed page of ten authors is otherwise twenty round trips.
   */
  async degreesFor(
    viewerId: string,
    otherIds: string[],
  ): Promise<Map<string, { degree: DegreeBadge; mutuals: number }>> {
    const out = new Map<string, { degree: DegreeBadge; mutuals: number }>();
    const targets = otherIds.filter((id) => id !== viewerId);
    for (const id of otherIds) if (id === viewerId) out.set(id, { degree: "self", mutuals: 0 });
    if (targets.length === 0) return out;

    const [connections, seconds] = await Promise.all([
      this.prisma.connection.findMany({
        where: {
          status: "ACCEPTED",
          OR: [
            { requesterId: viewerId, receiverId: { in: targets } },
            { receiverId: viewerId, requesterId: { in: targets } },
          ],
        },
        select: { requesterId: true, receiverId: true },
      }),
      this.prisma.secondDegree.findMany({
        where: { userId: viewerId, peerId: { in: targets } },
        select: { peerId: true, mutuals: true },
      }),
    ]);

    const first = new Set(
      connections.map((c) => (c.requesterId === viewerId ? c.receiverId : c.requesterId)),
    );
    const second = new Map(seconds.map((s) => [s.peerId, s.mutuals]));

    for (const id of targets) {
      if (first.has(id)) out.set(id, { degree: "1st", mutuals: 0 });
      else if (second.has(id)) out.set(id, { degree: "2nd", mutuals: second.get(id)! });
      else out.set(id, { degree: "3rd+", mutuals: 0 });
    }
    return out;
  }

  /**
   * A few faces for the stacked row, never the whole list.
   *
   * Three, because that is what fits, and because the count beside them is
   * what carries the information — the faces are there so the number is
   * checkable, not so it is exhaustive.
   */
  async mutualsWith(viewerId: string, otherId: string): Promise<MutualConnections> {
    const [mine, theirs] = await Promise.all([
      this.connectedIds(viewerId),
      this.connectedIds(otherId),
    ]);
    const shared = mine.filter((id) => theirs.includes(id));
    if (shared.length === 0) return { count: 0, sample: [] };

    const people = await this.prisma.user.findMany({
      where: { id: { in: shared.slice(0, 3) } },
      select: PERSON,
    });
    return {
      count: shared.length,
      sample: people
        .map(toPerson)
        .filter((p): p is FollowPerson => p !== null)
        .map(({ userId, handle, firstName, lastName, avatarUrl }) => ({
          userId,
          handle,
          firstName,
          lastName,
          avatarUrl,
        })),
    };
  }

  private async connectedIds(userId: string): Promise<string[]> {
    const rows = await this.prisma.connection.findMany({
      where: {
        status: "ACCEPTED",
        OR: [{ requesterId: userId }, { receiverId: userId }],
      },
      select: { requesterId: true, receiverId: true },
    });
    return rows.map((row) => (row.requesterId === userId ? row.receiverId : row.requesterId));
  }
}

const PERSON = {
  id: true,
  profile: {
    select: { handle: true, firstName: true, lastName: true, headline: true, avatarUrl: true },
  },
} as const;

type PersonRow = {
  id: string;
  profile: {
    handle: string;
    firstName: string;
    lastName: string;
    headline: string | null;
    avatarUrl: string | null;
  } | null;
};

/** A person, or null when the profile is missing — never a half-person. */
function toPerson(row: PersonRow | null): FollowPerson | null {
  if (!row?.profile) return null;
  return { userId: row.id, ...row.profile };
}
