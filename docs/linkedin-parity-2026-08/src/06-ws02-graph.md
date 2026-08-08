---

# 6. WS-02 — The graph: follow, degree, discovery

## 6.1 What the market forces

§2.1: the diaspora is 8.82 million people who mostly do not know each other and will never mutually connect at scale. A purely symmetric graph caps their participation at the size of their existing address book. §2.2: with 280,000 unemployed in the West Bank, a connection request from a stranger is low-signal noise for an employer, but a *follow* costs the employer nothing.

**The core diagnosis:** Baydar today has exactly one edge type — `Connection`, mutual, requiring acceptance. LinkedIn has three (connect, follow, follow-company) plus a topic subscription. Adding the asymmetric edge is the single highest-leverage graph change available, and every downstream workstream — feed (§8), content distribution (§7), groups (§9), newsletters (§7.5) — depends on it.

## 6.2 Data

```prisma
enum FollowTargetType { USER COMPANY TOPIC }

model Follow {
  id         String           @id @default(cuid())
  follower   User             @relation("FollowFollower", fields: [followerId], references: [id], onDelete: Cascade)
  followerId String
  targetType FollowTargetType
  // Exactly one of the three is set, enforced by a CHECK constraint added in
  // raw SQL by the migration (Prisma cannot express it).
  targetUser    User?    @relation("FollowTargetUser", fields: [targetUserId], references: [id], onDelete: Cascade)
  targetUserId  String?
  targetCompany Company? @relation(fields: [targetCompanyId], references: [id], onDelete: Cascade)
  targetCompanyId String?
  targetTopicKey  String?
  createdAt  DateTime @default(now())

  @@unique([followerId, targetType, targetUserId, targetCompanyId, targetTopicKey], name: "follow_unique_target")
  @@index([targetUserId])
  @@index([targetCompanyId])
  @@index([targetTopicKey])
  @@index([followerId, targetType])
}

// Denormalised counters. A COUNT(*) on Follow per profile card is the query
// that kills the feed at 100k rows.
model FollowerCount {
  targetType      FollowTargetType
  targetUserId    String?
  targetCompanyId String?
  targetTopicKey  String?
  count           Int      @default(0)
  updatedAt       DateTime @updatedAt
  @@id([targetType, targetUserId, targetCompanyId, targetTopicKey])
}

// "Stop showing me this person's posts, but stay connected." Distinct from
// BlockedUser (mutual invisibility) and from Follow (which this does not touch).
model FeedMute {
  user      User     @relation("FeedMuteUser", fields: [userId], references: [id], onDelete: Cascade)
  userId    String
  muted     User     @relation("FeedMuteMuted", fields: [mutedId], references: [id], onDelete: Cascade)
  mutedId   String
  createdAt DateTime @default(now())
  @@id([userId, mutedId])
  @@index([mutedId])
}

// Restrict: they can see me, they cannot message me or comment on my posts.
// The safety primitive between "nothing" and "block" — §16.4.
model RestrictedUser {
  user         User     @relation("RestrictOwner", fields: [userId], references: [id], onDelete: Cascade)
  userId       String
  restricted   User     @relation("RestrictTarget", fields: [restrictedId], references: [id], onDelete: Cascade)
  restrictedId String
  createdAt    DateTime @default(now())
  @@id([userId, restrictedId])
  @@index([restrictedId])
}

// Materialised second-degree adjacency, refreshed nightly. Computing degree
// live is a two-hop join per card; at feed scale that is not affordable.
// Only degree 2 is stored — degree 3 is rendered as "3rd+" without proof,
// which is exactly what LinkedIn does and is honest enough.
model SecondDegree {
  user     User   @relation("SecondDegreeUser", fields: [userId], references: [id], onDelete: Cascade)
  userId   String
  peer     User   @relation("SecondDegreePeer", fields: [peerId], references: [id], onDelete: Cascade)
  peerId   String
  // How many 1st-degree connections they share. Drives "3 mutual connections".
  mutuals  Int
  refreshedAt DateTime @default(now())
  @@id([userId, peerId])
  @@index([userId, mutuals])
}
```

**Changed:** `Company` gains `followers FollowerCount?` conceptually (resolved by query, not relation) and `Profile` gains nothing — follower counts are read from `FollowerCount`.

**DECIDED — connection implies follow.** When a `Connection` becomes `ACCEPTED`, two `Follow` rows are created (one each way) in the same transaction. Unfollowing does not disconnect; disconnecting deletes both follows. This is LinkedIn's model and it is correct: it means the feed only ever has to read one edge type.

**DECIDED — no reverse-follow notification for high-follower accounts.** Above 500 followers, individual follow notifications are suppressed and replaced by a weekly aggregate. Otherwise a company page with any traction generates a notification storm on a 2G connection.

## 6.3 Contracts

`packages/shared/src/schemas/follow.ts`: `FollowTarget`, `FollowBody`, `FollowState`, `FollowerCounts`, `DegreeBadge` (`"1st" | "2nd" | "3rd+" | "self"`), `MutualConnections`.

`packages/shared/src/schemas/discovery.ts`: `SuggestionReason` (see §6.5), `PeopleSuggestion`, `AlumniQuery`, `DiasporaQuery`.

**Every person-shaped DTO in the product gains three fields** — `degree: DegreeBadge`, `mutualCount: number`, `followState: { following: boolean; followsYou: boolean }`. This is a breaking DTO change; it must land in one commit across `profile.ts`, `search.ts`, `connection.ts` and `post.ts` (author block), with both clients updated in the same commit. `check:ui-lockstep` and the shared api-client spec will catch a half-done version.

## 6.4 API

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/follows` | Body: `{ targetType, targetUserId? \| targetCompanyId? \| targetTopicKey? }` |
| DELETE | `/follows` | Same body shape; idempotent |
| GET | `/follows/me` | `?targetType=`, cursor-paged |
| GET | `/follows/followers` | Who follows me, cursor-paged |
| GET | `/profiles/:handle/followers` | Public count + paged list, respects `diasporaVisible` and privacy |
| POST | `/feed-mutes` / DELETE `/feed-mutes/:userId` | |
| GET | `/feed-mutes` | |
| POST | `/restrictions` / DELETE `/restrictions/:userId` | |
| GET | `/restrictions` | |
| GET | `/connections/degree/:userId` | Single lookup for a profile page |
| GET | `/discovery/people` | Replaces `/connections/suggestions`; keeps the old path as an alias for one release |
| GET | `/discovery/alumni` | `?universityKey=&graduationYearFrom=&to=` |
| GET | `/discovery/diaspora` | `?originGovernorate=&residenceCountry=&occupationKey=` |
| GET | `/discovery/nearby` | `?governorateKey=` — occupation peers in the same governorate |
| POST | `/admin/internal/second-degree/refresh` | `InternalTokenGuard`; the nightly cron |

## 6.5 The suggestion engine — exact rules

`GET /connections/suggestions` today has no occupation, governorate or alumni signal. **DECIDED — the replacement scores each candidate and returns the top 20 with an explicit reason**, because FEED-RANKING.md's explainability rule generalises: if the product cannot say why, it does not show it.

```
suggestionScore(viewer, candidate) =
    22 * min(mutuals, 8) / 8                        // SHARED_CONNECTIONS
  + 18 * (sameOccupationFamily ? 1 : 0)             // SAME_FAMILY
  + 14 * (sameUniversity && yearsOverlap ? 1 : 0)   // ALUMNI
  + 12 * proximityScore(viewerGov, candidateGov)    // NEARBY  (0..1, existing fn)
  + 10 * (sharedCompanyEver ? 1 : 0)                // COWORKER
  +  8 * (sameOriginGovernorate && bothDiaspora ? 1 : 0)  // SAME_ORIGIN
  +  8 * (candidateFollowsViewer ? 1 : 0)           // FOLLOWS_YOU
  +  8 * min(candidate.evidenceScore, 100) / 100    // ESTABLISHED
```

`SuggestionReason` is the highest-weighted **non-zero** term, returned with the candidate so the card can say «٤ معارف مشتركين» or «خرّيجو جامعة النجاح». Ties break on `evidenceScore`, then `createdAt` descending.

Excluded from results, always: blocked either way, restricted either way, already connected, a pending request either way, `deletedAt` non-null, and anyone the viewer has dismissed (new `SuggestionDismissal` table: `(userId, dismissedId, createdAt)`, 90-day TTL).

**Rule 1 compliance:** no term is derived from a subscription, a plan, a credit or a Karama balance. `check-ranking-purity.mjs` scans `discovery.service.ts`.

## 6.6 Web and mobile

**Web** — `network/` gains four tabs (`Tabs`): معارفي · دعوات · اقتراحات · متابَعون. New routes `network/followers`, `network/following`, `network/alumni`, `network/diaspora`. `in/[handle]` gains a follow button beside connect, a follower count, and a degree chip.

**Mobile** — the same four tabs on `network.tsx` (already a `ScrollView` tab strip, so no wrapping risk), plus `network/followers.tsx`, `network/following.tsx`, `network/alumni.tsx`, `network/diaspora.tsx`.

**New shared components (both kits, same commit):** `FollowButton` (variants `follow | following | followBack`, with an optimistic state and a rollback on failure), `DegreeChip`, `MutualsRow` (stacked avatars + count), `SuggestionCard` (extends `RecordCard` with a reason line).

## 6.7 i18n

New namespace `discovery`. Extended: `network`, `profile`. ~118 keys per catalog.

Register note: **متابعة** for follow, **تواصل** for connect. These must never be swapped, and the two words must not both appear on one button. `check-naming.mjs` gains an i18n-value check for this pair.

## 6.8 Tests and gates

- `follow.service.spec.ts` — CHECK constraint on exactly-one-target, idempotent unfollow, counter accuracy under concurrent follows (transaction + `UPDATE … SET count = count + 1`, never read-modify-write).
- `connection.service.spec.ts` (extend) — accept creates two follows; delete removes both; block removes both and the restriction.
- `discovery.service.spec.ts` — every term, every exclusion, reason selection, dismissal TTL.
- `second-degree.job.spec.ts` — refresh correctness on a 6-node fixture; asserts the job is idempotent and that a deleted user disappears.
- Load: `pnpm load:api:baseline` must not regress `GET /feed` p95 after the DTO gains three fields.
