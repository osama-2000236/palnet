// Everyone a discovery list must not show.
//
// Its own class because the rules are a list that grows — blocked, restricted
// either way, already connected, dismissed — and each addition is a decision
// somebody should be able to find without reading a query layer around it.
//
// It also puts `discovery.service.ts` back under the 300-LOC design ceiling.

import { Injectable } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";
import { SafetyService } from "../safety/safety.service";

/** How long a dismissal keeps somebody out of the list. */
const DISMISSAL_TTL_DAYS = 90;

@Injectable()
export class DiscoveryExclusions {
  constructor(
    private readonly prisma: PrismaService,
    private readonly safety: SafetyService,
  ) {}

  /**
   * Everyone who must not appear.
   *
   * Blocked either way, restricted either way, already connected or requested,
   * dismissed within the TTL, and the viewer. A suggestion list that ignores a
   * dismissal is worse than no list: it teaches the member that the control
   * does nothing.
   */
  async forViewer(
    viewerId: string,
    options: { includeConnections?: boolean } = {},
  ): Promise<Set<string>> {
    const includeConnections = options.includeConnections ?? true;
    const dismissedAfter = new Date(Date.now() - DISMISSAL_TTL_DAYS * 24 * 60 * 60 * 1000);

    const [connections, blocked, restrictions, restrictedBy, dismissals] = await Promise.all([
      includeConnections
        ? this.prisma.connection.findMany({
            where: { OR: [{ requesterId: viewerId }, { receiverId: viewerId }] },
            select: { requesterId: true, receiverId: true },
          })
        : Promise.resolve([]),
      this.safety.getBlockedEitherIds(viewerId),
      this.prisma.restrictedUser.findMany({
        where: { userId: viewerId },
        select: { restrictedId: true },
      }),
      this.prisma.restrictedUser.findMany({
        where: { restrictedId: viewerId },
        select: { userId: true },
      }),
      this.prisma.suggestionDismissal.findMany({
        where: { userId: viewerId, createdAt: { gte: dismissedAfter } },
        select: { dismissedId: true },
      }),
    ]);

    const excluded = new Set<string>([viewerId, ...blocked]);
    for (const row of connections) {
      excluded.add(row.requesterId);
      excluded.add(row.receiverId);
    }
    for (const row of restrictions) excluded.add(row.restrictedId);
    for (const row of restrictedBy) excluded.add(row.userId);
    for (const row of dismissals) excluded.add(row.dismissedId);
    return excluded;
  }
}
