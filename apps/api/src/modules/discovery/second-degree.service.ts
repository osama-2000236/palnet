import { Injectable, Logger } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";

export interface SecondDegreeReport {
  scannedAt: string;
  users: number;
  pairs: number;
  dryRun: boolean;
}

/**
 * Rebuild the second-degree table.
 *
 * "How far away is this person, and how many connections do we share" is a
 * two-hop join. Answering it live costs that join per card, and a feed page is
 * ten cards — so it is materialised nightly instead, and a card that is a few
 * hours stale about a second-degree relationship is a card nobody notices.
 *
 * First degree is never read from here. It has to be exact — a badge saying
 * "2nd" about somebody you connected with an hour ago is wrong in a way members
 * do notice — so `GraphService` looks that up live and only falls through to
 * this table for degree 2.
 */
@Injectable()
export class SecondDegreeService {
  private readonly logger = new Logger(SecondDegreeService.name);

  constructor(private readonly prisma: PrismaService) {}

  async refresh(options: { dryRun?: boolean } = {}): Promise<SecondDegreeReport> {
    const dryRun = options.dryRun ?? false;
    const scannedAt = new Date();

    const edges = await this.prisma.connection.findMany({
      where: { status: "ACCEPTED" },
      select: { requesterId: true, receiverId: true },
    });

    const adjacency = new Map<string, Set<string>>();
    const link = (a: string, b: string): void => {
      const set = adjacency.get(a) ?? new Set<string>();
      set.add(b);
      adjacency.set(a, set);
    };
    for (const edge of edges) {
      link(edge.requesterId, edge.receiverId);
      link(edge.receiverId, edge.requesterId);
    }

    // For each member, everyone their connections are connected to, minus
    // themselves and minus their own first degree. Counting shared neighbours
    // as we go is what makes «٤ معارف مشتركين» free rather than a second pass.
    const rows: Array<{ userId: string; peerId: string; mutuals: number }> = [];
    for (const [userId, firstDegree] of adjacency) {
      const mutuals = new Map<string, number>();
      for (const neighbour of firstDegree) {
        for (const peer of adjacency.get(neighbour) ?? []) {
          if (peer === userId || firstDegree.has(peer)) continue;
          mutuals.set(peer, (mutuals.get(peer) ?? 0) + 1);
        }
      }
      for (const [peerId, count] of mutuals) {
        rows.push({ userId, peerId, mutuals: count });
      }
    }

    if (dryRun) {
      this.logger.log(
        `Second-degree dry run: ${adjacency.size} member(s), ${rows.length} pair(s); nothing written.`,
      );
      return {
        scannedAt: scannedAt.toISOString(),
        users: adjacency.size,
        pairs: rows.length,
        dryRun: true,
      };
    }

    // Replace wholesale rather than upsert: a member who disconnected must
    // disappear from the table, and there is no delete event to hang that on.
    // Idempotent by construction — the same graph produces the same rows.
    await this.prisma.$transaction(async (tx) => {
      await tx.secondDegree.deleteMany({});
      for (let i = 0; i < rows.length; i += 1000) {
        await tx.secondDegree.createMany({
          data: rows.slice(i, i + 1000).map((row) => ({ ...row, refreshedAt: scannedAt })),
          skipDuplicates: true,
        });
      }
    });

    this.logger.log(
      `Second-degree refresh: ${adjacency.size} member(s), ${rows.length} pair(s) written.`,
    );
    return {
      scannedAt: scannedAt.toISOString(),
      users: adjacency.size,
      pairs: rows.length,
      dryRun: false,
    };
  }
}
