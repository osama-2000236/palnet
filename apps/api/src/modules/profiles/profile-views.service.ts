import { anonymiseBuckets, type ProfileViewSummary, type ProfileViewsQuery } from "@baydar/shared";
import { Injectable } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";

// Who looked at your profile, without ever naming them.
//
// LinkedIn sells named viewers. Baydar does not, and that is not a pricing
// decision: in a market this small, "an employer from your governorate viewed
// you" on a known date identifies one person, and a member who learns their
// current employer looked has learned something dangerous. In a place where
// employment and politics are not separable, it can be worse than dangerous.
//
// So the storage itself cannot answer the question. There are no per-view rows
// to leak, subpoena or accidentally join — one counter row per profile per day,
// with the breakdowns as JSON tallies, k-anonymised on the way out.

/** A day key in UTC, matching the `@db.Date` column. */
function dayKey(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

type Tally = Record<string, number>;

/** JSON columns come back as `unknown`; anything that is not a tally is treated
 *  as an empty one rather than crashing a read on a bad row. */
function asTally(value: unknown): Tally {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Tally = {};
  for (const [key, count] of Object.entries(value as Record<string, unknown>)) {
    if (typeof count === "number" && Number.isFinite(count)) out[key] = count;
  }
  return out;
}

function merge(into: Tally, from: Tally): void {
  for (const [key, count] of Object.entries(from)) into[key] = (into[key] ?? 0) + count;
}

@Injectable()
export class ProfileViewsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Record a view. Fire-and-forget from the read path.
   *
   * Self-views do not count, which is the difference between a metric and a
   * vanity counter. Everything else is one upsert with two atomic increments —
   * no row is read back, so two viewers in the same millisecond cannot lose
   * each other's count.
   */
  async record(target: { profileId: string; userId: string }, viewerUserId: string): Promise<void> {
    // Compared on user ids, not profile ids: the caller has the profile it just
    // rendered and the viewer's session, and looking up the viewer's own
    // profile id purely to compare would be a query per profile view.
    if (target.userId === viewerUserId) return;
    const profileId = target.profileId;

    const [occupation, governorate] = await this.viewerBuckets(viewerUserId);
    const day = dayKey(new Date());

    const existing = await this.prisma.profileViewDaily.findUnique({
      where: { profileId_day: { profileId, day } },
      select: { byOccupation: true, byGovernorate: true },
    });

    // Read-modify-write on the JSON tallies. Two viewers in the same second can
    // race here and lose one bucket increment; `views` is the number the
    // product shows and that one is a true atomic increment. A lost bucket in a
    // k-anonymised breakdown is not worth a row lock per profile view.
    const byOccupation = asTally(existing?.byOccupation);
    const byGovernorate = asTally(existing?.byGovernorate);
    if (occupation) merge(byOccupation, { [occupation]: 1 });
    if (governorate) merge(byGovernorate, { [governorate]: 1 });

    await this.prisma.profileViewDaily.upsert({
      where: { profileId_day: { profileId, day } },
      create: { profileId, day, views: 1, byOccupation, byGovernorate },
      update: { views: { increment: 1 }, byOccupation, byGovernorate },
    });
  }

  /** The viewer's primary occupation and origin governorate, or nulls. */
  private async viewerBuckets(userId: string): Promise<[string | null, string | null]> {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      select: {
        originGovernorate: true,
        claims: { where: { isPrimary: true }, select: { occupationKey: true }, take: 1 },
      },
    });
    return [profile?.claims[0]?.occupationKey ?? null, profile?.originGovernorate ?? null];
  }

  async summaryFor(userId: string, query: ProfileViewsQuery): Promise<ProfileViewSummary> {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!profile)
      return { totalViews: 0, days: [], byOccupation: [], byGovernorate: [], suppressedViews: 0 };

    const since = dayKey(new Date(Date.now() - query.days * 24 * 60 * 60 * 1000));
    const rows = await this.prisma.profileViewDaily.findMany({
      where: { profileId: profile.id, day: { gte: since } },
      orderBy: { day: "asc" },
    });

    const occupation: Tally = {};
    const governorate: Tally = {};
    let totalViews = 0;
    const days = rows.map((row) => {
      totalViews += row.views;
      merge(occupation, asTally(row.byOccupation));
      merge(governorate, asTally(row.byGovernorate));
      return { day: row.day.toISOString().slice(0, 10), views: row.views };
    });

    const byOccupation = anonymiseBuckets(occupation);
    const byGovernorate = anonymiseBuckets(governorate);

    return {
      totalViews,
      days,
      byOccupation: byOccupation.buckets,
      byGovernorate: byGovernorate.buckets,
      // The larger of the two, not the sum: they are two views of the same
      // visitors, and adding them would claim more suppressed views than there
      // were visitors.
      suppressedViews: Math.max(byOccupation.suppressed, byGovernorate.suppressed),
    };
  }
}
