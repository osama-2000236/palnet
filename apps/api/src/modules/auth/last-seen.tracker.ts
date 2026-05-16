import { Injectable, Logger } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";

// Throttle window: a single user only writes lastSeenAt once per 5 minutes to
// avoid amplifying every authenticated request into a row update. Karama
// monthly decay reads lastSeenAt and 5-minute granularity is fine for an
// inactivity check measured in days.
const TOUCH_THROTTLE_MS = 5 * 60 * 1000;
// Soft upper bound on the in-memory map to avoid unbounded growth on bot
// traffic with unique JWT subjects. When we cross this size we prune the
// oldest half. Bounded memory ~ MAX_TRACKED * (40 bytes for cuid + number).
const MAX_TRACKED = 100_000;

@Injectable()
export class LastSeenTracker {
  private readonly log = new Logger(LastSeenTracker.name);
  private readonly lastTouch = new Map<string, number>();

  constructor(private readonly prisma: PrismaService) {}

  // Fire-and-forget; never blocks the request path.
  touch(userId: string, now: number = Date.now()): void {
    if (!userId) return;
    const previous = this.lastTouch.get(userId);
    if (previous !== undefined && now - previous < TOUCH_THROTTLE_MS) return;

    this.lastTouch.set(userId, now);
    this.maybePrune();

    void this.prisma.user
      .update({
        where: { id: userId },
        data: { lastSeenAt: new Date(now) },
        select: { id: true },
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        this.log.warn(`Failed to update lastSeenAt for ${userId}: ${message}`);
      });
  }

  private maybePrune(): void {
    if (this.lastTouch.size <= MAX_TRACKED) return;
    // Drop the older half — insertion order on a Map is the touch order.
    const drop = Math.floor(MAX_TRACKED / 2);
    let dropped = 0;
    for (const key of this.lastTouch.keys()) {
      if (dropped >= drop) break;
      this.lastTouch.delete(key);
      dropped += 1;
    }
  }
}
