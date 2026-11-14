import type { FeedReason } from "@baydar/shared";

// docs/design/FEED-RANKING.md. Topic affinity (0.30 in the doc) waits for the
// F1 tagger — nothing writes PostTopic yet — so its share is spread over the
// three signals that exist today.
// ponytail: hand-tuned constants, move them behind the F6 config once there is
// engagement data to tune against.
export const FEED_WEIGHTS = { affinity: 0.45, recency: 0.35, quality: 0.2 } as const;
export const AFFINITY = { network: 1, repost: 0.6, nearby: 0.2, discover: 0.1 } as const;
const RECENCY_TAU_HOURS = 24;
export const HORIZON_MS = 14 * 24 * 60 * 60 * 1000;
export const SLATE_SIZE = 200;
export const SLATE_TTL_MS = 30 * 60 * 1000;
export const NETWORK_CANDIDATES = 300;
export const REPOST_CANDIDATES = 200;
export const DISCOVER_CANDIDATES = 200;
const AUTHOR_WINDOW = 10;
const AUTHOR_CAP = 2;
// Every tenth slot goes to the best post from outside the network, when one
// exists — the cold-start path for someone with no connections yet.
const SERENDIPITY_EVERY = 10;

export type SlateReasons = Record<string, FeedReason>;

export interface Candidate {
  postId: string;
  authorId: string;
  score: number;
  outOfNetwork: boolean;
  reason: FeedReason | null;
}

interface Engagement {
  _count: { reactions: number; comments: number; reposts: number };
}
export function score(affinity: number, at: Date, now: number, post: Engagement): number {
  const ageHours = Math.max(0, now - at.getTime()) / 3_600_000;
  const recency = Math.exp(-ageHours / RECENCY_TAU_HOURS);
  const { reactions, comments, reposts } = post._count;
  // ponytail: raw counts, so a ring of accounts can farm it; the ceiling of
  // 50 weighted engagements caps how far that gets a post. Per-author
  // normalisation is the F4 fix.
  const quality = Math.min(1, Math.log1p(reactions + 2 * comments + 3 * reposts) / Math.log1p(50));
  return (
    FEED_WEIGHTS.affinity * affinity +
    FEED_WEIGHTS.recency * recency +
    FEED_WEIGHTS.quality * quality
  );
}

// One entry per post, keeping its best-scoring route in (a post both written
// by a connection and reposted by another keeps whichever ranks higher).
export function dedupe(candidates: Candidate[]): Candidate[] {
  const best = new Map<string, Candidate>();
  for (const c of candidates) {
    const seen = best.get(c.postId);
    if (!seen || c.score > seen.score) best.set(c.postId, c);
  }
  return [...best.values()].sort((a, b) => b.score - a.score);
}

/**
 * Greedy fill over the score-sorted list: no author more than twice in any
 * ten consecutive posts, and every tenth slot to the best out-of-network post.
 * When the cap leaves nothing eligible (a one-author network) the best post
 * goes in anyway — a short feed beats an empty one.
 * ponytail: O(slate × candidates), ~140k steps at the caps.
 */
export function diversify(sorted: Candidate[]): Candidate[] {
  const pool = [...sorted];
  const out: Candidate[] = [];
  while (out.length < SLATE_SIZE && pool.length > 0) {
    const recent = out.slice(-(AUTHOR_WINDOW - 1)).map((c) => c.authorId);
    const underCap = (c: Candidate) => recent.filter((a) => a === c.authorId).length < AUTHOR_CAP;
    const serendipity = (out.length + 1) % SERENDIPITY_EVERY === 0;
    let i = serendipity ? pool.findIndex((c) => c.outOfNetwork && underCap(c)) : -1;
    if (i < 0) i = pool.findIndex(underCap);
    if (i < 0) i = 0;
    out.push(pool.splice(i, 1)[0]!);
  }
  return out;
}

// "Ramallah" and "ramallah " are one city; Arabic and Latin spellings of the
// same city are not matched.
// ponytail: free-text city, add a city key to Profile if NEARBY misses too often.
export function normaliseCity(city: string | null | undefined): string | null {
  const v = city?.trim().toLowerCase();
  return v ? v : null;
}
