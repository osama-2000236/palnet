import {
  compareSuggestions,
  followTargetKey,
  governorateOfCity,
  occupationFamilyOf,
  proximityScore,
  suggestionReason,
  suggestionScore,
  type AlumniQuery,
  type DiasporaQuery,
  type DiscoveryPerson,
  type NearbyQuery,
  type PeopleSuggestion,
  type SuggestionInput,
} from "@baydar/shared";
import { Injectable } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";
import { GraphService } from "../graph/graph.service";
import { SafetyService } from "../safety/safety.service";

/** How long a dismissal keeps somebody out of the list. */
const DISMISSAL_TTL_DAYS = 90;
const CANDIDATE_POOL = 200;
const RESULT_SIZE = 20;

/**
 * Who to suggest, and why.
 *
 * Every candidate is scored by a pure function over a closed input
 * (`suggestionScore`), and every returned candidate carries the reason it
 * scored. A candidate whose every term is zero has no reason and is not
 * returned — showing somebody with nothing to say about them is what the
 * endpoint used to do.
 */
@Injectable()
export class DiscoveryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly safety: SafetyService,
    private readonly graph: GraphService,
  ) {}

  async peopleYouMayKnow(viewerId: string): Promise<PeopleSuggestion[]> {
    const [viewer, excluded] = await Promise.all([
      this.viewerContext(viewerId),
      this.excludedIds(viewerId),
    ]);

    const candidates = await this.prisma.profile.findMany({
      where: {
        userId: { notIn: [...excluded] },
        user: { isActive: true, deletedAt: null },
      },
      orderBy: [{ updatedAt: "desc" }],
      take: CANDIDATE_POOL,
      select: CANDIDATE_SELECT,
    });
    if (candidates.length === 0) return [];

    const ids = candidates.map((c) => c.userId);
    const [degrees, followedByViewer, followingViewer] = await Promise.all([
      this.graph.degreesFor(viewerId, ids),
      this.followsFrom(viewerId, ids),
      this.followsTo(viewerId, ids),
    ]);

    const scored = candidates
      .map((candidate) => {
        const degree = degrees.get(candidate.userId) ?? { degree: "3rd+" as const, mutuals: 0 };
        const input = this.inputFor(
          viewer,
          candidate,
          degree.mutuals,
          followingViewer.has(candidate.userId),
        );
        const reason = suggestionReason(input);
        if (!reason) return null;
        return {
          candidate,
          degree,
          reason,
          input,
          score: suggestionScore(input),
          evidenceScore: input.evidenceScore,
          createdAt: candidate.user.createdAt.getTime(),
          following: followedByViewer.has(candidate.userId),
          followsYou: followingViewer.has(candidate.userId),
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null)
      .sort(compareSuggestions)
      .slice(0, RESULT_SIZE);

    return scored.map((row) => ({
      user: personOf(row.candidate),
      graph: {
        degree: row.degree.degree,
        mutualCount: row.degree.mutuals,
        followState: { following: row.following, followsYou: row.followsYou },
      },
      reason: row.reason,
      reasonCount: row.reason === "SHARED_CONNECTIONS" ? row.degree.mutuals : null,
      reasonKey: reasonKeyFor(row.reason, row.candidate, viewer),
    }));
  }

  /** "Not this person." Kept for 90 days, then the sweep forgets it. */
  async dismiss(viewerId: string, dismissedId: string): Promise<void> {
    await this.prisma.suggestionDismissal.createMany({
      data: [{ userId: viewerId, dismissedId }],
      skipDuplicates: true,
    });
  }

  async alumni(viewerId: string, query: AlumniQuery): Promise<DiscoveryPerson[]> {
    const excluded = await this.excludedIds(viewerId, { includeConnections: false });
    const rows = await this.prisma.profile.findMany({
      where: {
        userId: { notIn: [...excluded] },
        user: { isActive: true, deletedAt: null },
        educations: {
          some: {
            school: { contains: query.universityKey, mode: "insensitive" },
            ...(query.graduationYearFrom || query.graduationYearTo
              ? {
                  endDate: {
                    ...(query.graduationYearFrom
                      ? { gte: new Date(Date.UTC(query.graduationYearFrom, 0, 1)) }
                      : {}),
                    ...(query.graduationYearTo
                      ? { lte: new Date(Date.UTC(query.graduationYearTo, 11, 31)) }
                      : {}),
                  },
                }
              : {}),
          },
        },
      },
      take: RESULT_SIZE,
      select: CANDIDATE_SELECT,
    });
    return this.decorate(viewerId, rows);
  }

  /**
   * The diaspora, findable by where they are from.
   *
   * 8.82 million people abroad against 5.56 million at home. Nothing in the
   * product lets them find each other by origin, which is the one thing they
   * reliably share.
   */
  async diaspora(viewerId: string, query: DiasporaQuery): Promise<DiscoveryPerson[]> {
    const excluded = await this.excludedIds(viewerId, { includeConnections: false });
    const rows = await this.prisma.profile.findMany({
      where: {
        userId: { notIn: [...excluded] },
        user: { isActive: true, deletedAt: null },
        ...(query.residenceCountry
          ? { country: query.residenceCountry }
          : { NOT: { country: "PS" } }),
      },
      take: CANDIDATE_POOL,
      select: CANDIDATE_SELECT,
    });

    // Origin is derived from the stored city rather than filtered in SQL:
    // `originGovernorate` is a P3 column and does not exist yet, and
    // `governorateOfCity` is the same function the ranker uses.
    const filtered = query.originGovernorate
      ? rows.filter((row) => governorateOfCity(row.location) === query.originGovernorate)
      : rows;

    return this.decorate(viewerId, filtered.slice(0, RESULT_SIZE));
  }

  /** Occupation peers in one governorate. Craft hiring is hyper-local. */
  async nearby(viewerId: string, query: NearbyQuery): Promise<DiscoveryPerson[]> {
    const excluded = await this.excludedIds(viewerId, { includeConnections: false });
    const rows = await this.prisma.profile.findMany({
      where: { userId: { notIn: [...excluded] }, user: { isActive: true, deletedAt: null } },
      take: CANDIDATE_POOL,
      select: CANDIDATE_SELECT,
    });
    const inGovernorate = rows.filter(
      (row) => governorateOfCity(row.location) === query.governorateKey,
    );
    return this.decorate(viewerId, inGovernorate.slice(0, RESULT_SIZE));
  }

  // ── internals ────────────────────────────────────────────────────────────

  private async decorate(viewerId: string, rows: CandidateRow[]): Promise<DiscoveryPerson[]> {
    if (rows.length === 0) return [];
    const ids = rows.map((row) => row.userId);
    const [degrees, following, followsYou] = await Promise.all([
      this.graph.degreesFor(viewerId, ids),
      this.followsFrom(viewerId, ids),
      this.followsTo(viewerId, ids),
    ]);
    return rows.map((row) => {
      const degree = degrees.get(row.userId) ?? { degree: "3rd+" as const, mutuals: 0 };
      return {
        user: personOf(row),
        graph: {
          degree: degree.degree,
          mutualCount: degree.mutuals,
          followState: {
            following: following.has(row.userId),
            followsYou: followsYou.has(row.userId),
          },
        },
        location: row.location ?? null,
      };
    });
  }

  private inputFor(
    viewer: ViewerContext,
    candidate: CandidateRow,
    mutuals: number,
    candidateFollowsViewer: boolean,
  ): SuggestionInput {
    const candidateGovernorate = governorateOfCity(candidate.location);
    return {
      mutuals,
      sameOccupationFamily:
        !!viewer.occupationFamily &&
        viewer.occupationFamily === occupationFamilyOf(occupationKeyOf(candidate) ?? ""),
      alumniOverlap: candidate.educations.some((e) => viewer.schools.has(normalise(e.school))),
      proximity: proximityScore(viewer.location, candidate.location),
      sharedCompanyEver: candidate.experiences.some((e) =>
        viewer.companies.has(normalise(e.companyName)),
      ),
      sameOriginGovernorate:
        !!viewer.governorate &&
        !!candidateGovernorate &&
        viewer.governorate === candidateGovernorate,
      candidateFollowsViewer,
      // P3 introduces the evidence score. Zero until then, which is honest:
      // the term contributes nothing rather than a made-up number.
      evidenceScore: 0,
    };
  }

  private async viewerContext(viewerId: string): Promise<ViewerContext> {
    const profile = await this.prisma.profile.findUnique({
      where: { userId: viewerId },
      select: CANDIDATE_SELECT,
    });
    return {
      location: profile?.location ?? null,
      governorate: governorateOfCity(profile?.location),
      occupationFamily: profile ? occupationFamilyOf(occupationKeyOf(profile) ?? "") : null,
      schools: new Set((profile?.educations ?? []).map((e) => normalise(e.school))),
      companies: new Set((profile?.experiences ?? []).map((e) => normalise(e.companyName))),
    };
  }

  /**
   * Everyone who must not appear.
   *
   * Blocked either way, restricted either way, already connected or requested,
   * dismissed within the TTL, and the viewer. A suggestion list that ignores a
   * dismissal is worse than no list: it teaches the member that the control
   * does nothing.
   */
  private async excludedIds(
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

  private async followsFrom(viewerId: string, ids: string[]): Promise<Set<string>> {
    const rows = await this.prisma.follow.findMany({
      where: {
        followerId: viewerId,
        targetKey: {
          in: ids.map((id) => followTargetKey({ targetType: "USER", targetUserId: id })),
        },
      },
      select: { targetUserId: true },
    });
    return new Set(rows.map((row) => row.targetUserId).filter((id): id is string => !!id));
  }

  private async followsTo(viewerId: string, ids: string[]): Promise<Set<string>> {
    const rows = await this.prisma.follow.findMany({
      where: {
        followerId: { in: ids },
        targetKey: followTargetKey({ targetType: "USER", targetUserId: viewerId }),
      },
      select: { followerId: true },
    });
    return new Set(rows.map((row) => row.followerId));
  }
}

interface ViewerContext {
  location: string | null;
  governorate: string | null;
  occupationFamily: string | null;
  schools: Set<string>;
  companies: Set<string>;
}

const CANDIDATE_SELECT = {
  userId: true,
  handle: true,
  firstName: true,
  lastName: true,
  headline: true,
  avatarUrl: true,
  location: true,
  user: { select: { createdAt: true } },
  educations: { select: { school: true } },
  experiences: { select: { companyName: true } },
  // The occupation lives on OccupationClaim, not on Profile. Primary first,
  // because a member with three claims has one they lead with.
  claims: {
    where: { isPrimary: true },
    take: 1,
    select: { occupationKey: true },
  },
} as const;

type CandidateRow = {
  userId: string;
  handle: string;
  firstName: string;
  lastName: string;
  headline: string | null;
  avatarUrl: string | null;
  location: string | null;
  user: { createdAt: Date };
  educations: Array<{ school: string }>;
  experiences: Array<{ companyName: string }>;
  claims: Array<{ occupationKey: string }>;
};

const personOf = (row: CandidateRow) => ({
  userId: row.userId,
  handle: row.handle,
  firstName: row.firstName,
  lastName: row.lastName,
  headline: row.headline,
  avatarUrl: row.avatarUrl,
});

/** The occupation a member leads with, or null when they have claimed none. */
const occupationKeyOf = (row: CandidateRow): string | null => row.claims[0]?.occupationKey ?? null;

/** Case- and whitespace-insensitive, because members type these by hand. */
const normalise = (value: string): string => value.trim().toLowerCase().replace(/\s+/g, " ");

/** What the reason line names, when it names something. */
function reasonKeyFor(
  reason: PeopleSuggestion["reason"],
  candidate: CandidateRow,
  viewer: ViewerContext,
): string | null {
  if (reason === "SAME_FAMILY") return occupationKeyOf(candidate);
  if (reason === "ALUMNI") {
    return (
      candidate.educations.find((e) => viewer.schools.has(normalise(e.school)))?.school ?? null
    );
  }
  if (reason === "NEARBY" || reason === "SAME_ORIGIN") return governorateOfCity(candidate.location);
  return null;
}
