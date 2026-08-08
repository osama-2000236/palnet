---

# 7. WS-03 — Content: mentions, polls, articles, newsletters, drafts

## 7.1 What the market forces

§2.3 (2G in Gaza, 39% with no internet) is the governing constraint and it inverts LinkedIn's content priorities. LinkedIn's growth engine is video. Here, **video is the least viable format and text is the most**. §2.5 (10,000+ freelancers, 56% export) says the content that matters commercially is portfolio evidence and long-form professional writing, not short-form engagement bait.

`NotificationType.POST_MENTION` exists in the schema with **no mention model and no parser** — a notification type that can never fire. `TopicSource.HASHTAG` exists with no extractor. Both are commitments the schema made and the code never kept.

## 7.2 Data

```prisma
enum PostKind      { TEXT POLL ARTICLE NEWSLETTER_ISSUE WORK_SAMPLE }
enum PostVisibility { PUBLIC CONNECTIONS FOLLOWERS GROUP }
enum CommentPolicy  { ANYONE CONNECTIONS NOBODY }
enum PostStatus     { DRAFT SCHEDULED PUBLISHED }
enum MentionTargetType { USER COMPANY }

model PostMention {
  post       Post   @relation(fields: [postId], references: [id], onDelete: Cascade)
  postId     String
  targetType MentionTargetType
  targetUserId    String?
  targetCompanyId String?
  // Character offsets into Post.body so the renderer never re-parses.
  offsetStart Int
  offsetEnd   Int
  @@id([postId, offsetStart])
  @@index([targetUserId])
  @@index([targetCompanyId])
}

model CommentMention {
  comment    Comment @relation(fields: [commentId], references: [id], onDelete: Cascade)
  commentId  String
  targetType MentionTargetType
  targetUserId    String?
  targetCompanyId String?
  offsetStart Int
  offsetEnd   Int
  @@id([commentId, offsetStart])
  @@index([targetUserId])
}

model Poll {
  id          String   @id @default(cuid())
  post        Post     @relation(fields: [postId], references: [id], onDelete: Cascade)
  postId      String   @unique
  question    String
  closesAt    DateTime
  options     PollOption[]
  votes       PollVote[]
}

model PollOption {
  id      String @id @default(cuid())
  poll    Poll   @relation(fields: [pollId], references: [id], onDelete: Cascade)
  pollId  String
  label   String
  ordinal Int
  votes   Int    @default(0)   // denormalised; the source of truth is PollVote
  @@unique([pollId, ordinal])
}

model PollVote {
  poll     Poll       @relation(fields: [pollId], references: [id], onDelete: Cascade)
  pollId   String
  option   PollOption @relation(fields: [optionId], references: [id], onDelete: Cascade)
  optionId String
  user     User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId   String
  createdAt DateTime  @default(now())
  @@id([pollId, userId])
  @@index([optionId])
}

model Article {
  id          String   @id @default(cuid())
  post        Post     @relation(fields: [postId], references: [id], onDelete: Cascade)
  postId      String   @unique
  title       String
  subtitle    String?
  slug        String   @unique
  coverUrl    String?
  bodyMarkdown String  @db.Text     // a constrained subset — §7.4
  readMinutes Int
  newsletter  Newsletter? @relation(fields: [newsletterId], references: [id], onDelete: SetNull)
  newsletterId String?
  @@index([newsletterId])
}

model Newsletter {
  id          String   @id @default(cuid())
  owner       User     @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  ownerId     String
  title       String
  slug        String   @unique
  about       String?  @db.Text
  coverUrl    String?
  cadenceKey  String   // weekly | biweekly | monthly | irregular
  createdAt   DateTime @default(now())
  issues      Article[]
  subscriptions NewsletterSubscription[]
  @@index([ownerId])
}

model NewsletterSubscription {
  newsletter   Newsletter @relation(fields: [newsletterId], references: [id], onDelete: Cascade)
  newsletterId String
  user         User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId       String
  // Delivery channel. On 2G, email beats a push that opens an app.
  byEmail      Boolean    @default(true)
  byPush       Boolean    @default(false)
  createdAt    DateTime   @default(now())
  @@id([newsletterId, userId])
  @@index([userId])
}

// Aggregate counters only. A per-impression row at feed scale is a write
// amplification problem and a privacy problem, and nobody needs it.
model PostStats {
  post        Post     @relation(fields: [postId], references: [id], onDelete: Cascade)
  postId      String   @id
  impressions Int      @default(0)
  uniqueViewers Int    @default(0)   // HyperLogLog cardinality, stored as an int
  hllSketch   Bytes?
  expands     Int      @default(0)
  linkClicks  Int      @default(0)
  updatedAt   DateTime @updatedAt
}
```

**Changed `Post`:**

```prisma
model Post {
  // ... existing ...
  kind          PostKind       @default(TEXT)
  visibility    PostVisibility @default(CONNECTIONS)
  commentPolicy CommentPolicy  @default(ANYONE)
  status        PostStatus     @default(PUBLISHED)
  scheduledFor  DateTime?
  publishedAt   DateTime?
  groupId       String?        // set iff visibility = GROUP — §9
  editedAt      DateTime?

  mentions PostMention[]
  poll     Poll?
  article  Article?
  stats    PostStats?

  @@index([status, scheduledFor])
  @@index([groupId, publishedAt])
}
```

**Migration note — the `publishedAt` backfill.** Every existing row gets `status = 'PUBLISHED'` and `publishedAt = createdAt`. All feed and profile queries must switch from `createdAt` to `publishedAt` **in the same migration's follow-up commit**, or a scheduled post will appear in the feed at composition time. The two indexes on `Post` that reference `createdAt` gain `publishedAt` twins; the old ones are dropped one release later, not immediately.

## 7.3 The mention parser — decided precisely

**DECIDED.** Mentions are parsed **server-side on write**, never client-side, and never re-parsed on read.

- Syntax: `@` followed by a handle (`[a-z0-9-]{3,40}`) or, for companies, `@` followed by a company slug. Arabic display names are resolved by the client's typeahead into a handle before submission — the body stores the handle, the DTO carries the display name.
- The parser runs `arabicFold` over the surrounding text only for the typeahead query, never over the stored body.
- Offsets are **UTF-16 code-unit offsets**, matching JavaScript string indexing on both platforms, so the renderer can slice without re-scanning. This must be asserted in a test with an emoji and an Arabic-ligature fixture, because that is exactly where a code-point/code-unit mismatch shows up.
- Maximum 20 mentions per post, 10 per comment. Over the limit → `DomainException`, `TOO_MANY_MENTIONS`.
- A mention of a user who has `RestrictedUser` against the author produces **no notification and no link** — the text renders plain. This is silent by design; telling the author would defeat the restriction.
- `NotificationType.POST_MENTION` finally fires. Add `COMMENT_MENTION` to the enum.

## 7.4 The article body format — decided precisely

**DECIDED:** `Article.bodyMarkdown` is a **constrained CommonMark subset**, validated server-side by a Zod refinement, not a rich-text JSON blob.

Allowed: paragraphs, `#`–`###` headings, `**bold**`, `*italic*`, unordered and ordered lists, block quotes, fenced code, links, images by Baydar media id (`![alt](baydar:media/<id>)`), and horizontal rules. **Not allowed:** raw HTML, tables, footnotes, inline styles, arbitrary image URLs.

Why a subset rather than a rich editor: it renders identically in `ui-web` and `ui-native` from one parser in `@baydar/shared`, it survives being emailed as a newsletter issue, it is diff-able, and it cannot carry an XSS payload. A rich-text blob would need two renderers and would drift — which is exactly the failure mode `check:ui-lockstep` exists to prevent.

`readMinutes = ceil(wordCount / 180)` where `wordCount` counts Arabic and Latin word tokens after folding. 180 wpm is the conservative Arabic reading rate; the constant lives in `@baydar/shared` as `ARABIC_READ_WPM` with the source in a comment.

## 7.5 Newsletters — the delivery decision

**DECIDED:** a newsletter issue is an `Article` with `newsletterId` set. Publishing it does three things atomically: creates the `Post` (so it enters the feed for followers), enqueues an email to every `NewsletterSubscription` with `byEmail`, and enqueues a push to those with `byPush`.

Email goes through the existing Resend transport. **Batch size 200, 1 second between batches**, because a newsletter with 5,000 subscribers must not look like a spam burst to Resend or to the recipients' providers.

**DERIVED from §2.3:** `byEmail` defaults **true** and `byPush` defaults **false**. Email is asynchronous and survives being offline; a push notification for a long article on a 2G connection is an invitation to a 40-second blank screen.

## 7.6 API

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/posts` **(changed)** | Accepts `kind`, `visibility`, `commentPolicy`, `status`, `scheduledFor`, `poll`, `article` |
| PATCH | `/posts/:id` **(changed)** | Sets `editedAt`; visibility may only narrow after publish, never widen |
| GET | `/posts/drafts` | |
| POST | `/posts/:id/publish` | Draft or scheduled → published |
| POST | `/posts/:id/schedule` | |
| POST | `/polls/:pollId/vote` | One vote per user, immutable until `closesAt` |
| GET | `/polls/:pollId/results` | Hidden until the viewer votes or the poll closes |
| GET | `/articles/:slug` | |
| POST | `/newsletters` · PATCH `/newsletters/:id` | |
| GET | `/newsletters/:slug` | |
| POST | `/newsletters/:id/subscribe` · DELETE `/newsletters/:id/subscribe` | |
| GET | `/newsletters/me` | Owned + subscribed |
| GET | `/posts/:id/stats` | Author only |
| POST | `/posts/:id/signals` | Batched client signals — feeds §8. `{ kind, postId, dwellMs? }[]`, max 50 per call |
| GET | `/mentions/typeahead` | `?q=` — people + companies, folded |
| POST | `/admin/internal/scheduled-posts/publish` | `InternalTokenGuard`; cron every 5 minutes |

## 7.7 Web and mobile

**Composer becomes a router.** `Composer` today is a text box. It becomes a surface with five entry points — نص · استطلاع · مقال · عمل منجز · إصدار نشرة — each opening its own editor. On mobile, `composer.tsx` gets a `Sheet` with the same five, matching `ActionSheet`'s vocabulary.

New web routes: `compose/article`, `compose/poll`, `drafts`, `articles/[slug]`, `newsletters/[slug]`, `newsletters/manage`, `me/content-stats`.
New mobile routes: `compose/article.tsx`, `compose/poll.tsx`, `drafts.tsx`, `articles/[slug].tsx`, `newsletters/[slug].tsx`, `newsletters/manage.tsx`, `me/content-stats.tsx`.

**New shared components (both kits):** `PollCard`, `PollOptionRow`, `ArticleCard`, `ArticleReader`, `MentionText` (renders body + mention offsets), `MentionTypeahead`, `NewsletterCard`, `VisibilityPicker`, `SchedulePicker`, `StatRow`, `DocumentCarousel` (the multi-page renderer `MediaKind.DOCUMENT` never had).

**Video — DECIDED.** `MediaKind.VIDEO` stays in the enum and stays uploadable, but: no autoplay anywhere, ever; a poster frame plus an explicit play affordance; the play affordance is disabled with an explanatory line when the effective connection is 2G; and no transcoding pipeline is built (`project-spec.md` defers it, and §2.3 says it would not pay for itself). Uploads are capped at 60 seconds and 20 MB, rejected above with `MEDIA_TOO_LARGE` and a copy string that explains why in terms of the recipient's data, not the server's.

## 7.8 i18n

New namespaces: `article`, `poll`, `newsletter`, `drafts`, `stats`. Extended: `composer`, `post`, `feed`. ~264 keys per catalog.

## 7.9 Tests and gates

- Mention offsets: UTF-16 correctness with emoji + Arabic ligature fixtures, on both platforms' renderers.
- Poll: one vote per user; results hidden pre-vote; `closesAt` in the past rejects a vote; the denormalised `PollOption.votes` reconciles against `PollVote` in a nightly job whose spec asserts it self-heals.
- Article markdown: the Zod refinement rejects raw HTML, tables, and non-`baydar:` image URLs; the shared parser produces identical ASTs in the web and native test suites (**one snapshot, two consumers** — this is the lockstep proof).
- Scheduled publish: the cron publishes exactly once; a post scheduled in the past on creation publishes immediately; timezone is stored UTC and rendered in `Asia/Hebron`.
- Newsletter fanout: batching, ordering, and that a failed batch retries without re-sending the successful ones.
- Visibility: a `CONNECTIONS` post is invisible to a follower who is not a connection; a `FOLLOWERS` post is visible to both; narrowing after publish succeeds, widening returns `VISIBILITY_CANNOT_WIDEN`.
- Payload budget: `GET /feed` with 10 posts including one poll and one article ≤ **24 KB gzipped**. This is a hard assertion in `apps/api/test/payload-budget.e2e-spec.ts`, and it is the test that keeps §2.3 honest as features accumulate.

---

# 8. WS-04 — The ranked feed engine

## 8.1 What the market forces

`docs/design/FEED-RANKING.md` is an approved decision record with eleven sections and no implementation. `PostTopic`, `InterestWeight`, `FeedSlate` and `TopicMute` are committed tables with zero writers. `feed.service.ts` is 55 lines of reverse-chronological connection query.

§2.3 adds the constraint the design record could not have anticipated in full: **the feed must be finite and cheap.** An infinite scroll on a 2G connection is not engagement, it is a battery and data tax on people who can afford neither. FEED-RANKING.md already says session length is explicitly not an objective — §8 holds that line.

## 8.2 The engine, exactly

**Stage 1 — topic tagging on write.** Deterministic, no ML. On `POST /posts`, `topics.service.ts` writes `PostTopic` rows from five sources, matching `TopicSource`:

| Source | Rule |
| --- | --- |
| `AUTHOR_OCCUPATION` | One row per `OccupationClaim` the author holds, `topicKey = "occ:" + occupationKey` |
| `HASHTAG` | Every `#tag` in the body, folded, `topicKey = "tag:" + foldedTag`. Max 10. |
| `COMPANY` | Every company mention, `topicKey = "co:" + companyId` |
| `TEXT_MATCH` | Folded body matched against `PS_OCCUPATIONS` labels; a hit writes `topicKey = "occ:" + key`. Max 3, highest match length first. |
| `GOVERNORATE` | The author's `governorateOfCity(profile.location)`, `topicKey = "gov:" + governorateKey` |

Ceiling of **18 topics per post**. Above it, keep in the source order above (occupation, hashtag, company, text, governorate) and drop the tail.

**Stage 2 — interest weights.** `POST /posts/:id/signals` batches client signals. On arrival, for each topic on the signalled post:

```
w' = w * decay(now - updatedAt) + alpha * signalValue
decay(dt) = 0.5 ^ (dt_days / 30)          // 30-day half-life
alpha = 0.30
```

`signalValue` by `SignalKind` — **DECIDED**: `POST_EXPAND` +1.0 · `POST_DWELL` +0.5 (only counted above 4 seconds, capped at one per post) · `LINK_CLICK` +1.5 · `PROFILE_VISIT` +1.0 · `SEARCH_QUERY` +2.0 · `JOB_APPLY` +3.0 · `NOT_INTERESTED` −4.0 · `HIDE_POST` −2.0.

Weights clamp to `[-10, +10]`. A weight below `-3` implies a `TopicMute` row is offered to the user, never created silently — FEED-RANKING.md §7's explainability rule means the system may not develop opinions it cannot show you.

**Stage 3 — the score.** For a candidate post `p` and viewer `v`:

```
score(p, v) =
    1.00 * affinity(v, p.author)        // 0..1
  + 0.85 * topicMatch(v, p)             // 0..1, cosine over the sparse vectors
  + 0.60 * recency(p)                   // 0.5 ^ (age_hours / 18)
  + 0.45 * quality(p)                   // 0..1, see below
  + 0.30 * proximity(v, p)              // proximityScore(v.gov, author.gov)
  − 2.00 * mutedPenalty(v, p)           // 1 if any topic is muted, else 0
```

`affinity` = 1.0 for a 1st-degree connection, 0.6 for a followed non-connection, 0.35 for a 2nd-degree with ≥ 2 mutuals, 0.2 otherwise.
`quality` = `0.4·min(comments,8)/8 + 0.3·min(reactions,20)/20 + 0.3·(hasMedia||isWorkSample ? 1 : 0)`, all computed from denormalised counters, never from a live count.

**No term is money.** Rule 1 (§4.2) and `check-ranking-purity.mjs`.

**Stage 4 — diversity.** After scoring, apply the constraint FEED-RANKING.md §6 demands: **no more than 2 consecutive posts from the same author, and no more than 4 posts from one `topicKey` in any window of 10.** Implemented as a greedy re-order over the scored list, not a re-score.

**Stage 5 — the slate.** `FeedSlate` freezes the ordered `postIds` for **90 minutes**. Paging walks an offset into `postIds`, never a cursor over scores — FEED-RANKING.md §5 explains why: a ranked feed has no stable total order, so cursor pagination duplicates and skips. Slate size **120**. When the offset reaches the end, the feed ends — with a real ending screen, not an infinite spinner. **This is the finiteness requirement and it is not negotiable.**

**Stage 6 — cold start.** A viewer with fewer than 5 `InterestWeight` rows gets: their connections' posts (reverse-chron), plus posts tagged with their own `OccupationClaim` topics, plus posts from their governorate, in a 50/30/20 split. FEED-RANKING.md §8.

**Stage 7 — "why am I seeing this".** Every post in a slate carries `reason: { kind, topicKey?, authorHandle? }`, where `kind` is the highest-weighted contributing term. Rendered on demand behind the post's overflow menu. **Mandatory** — a post that cannot explain itself is a bug, and a test asserts every slate entry has a non-null reason.

## 8.3 API

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/feed` **(changed)** | `?sort=ranked\|recent&offset=` — `recent` bypasses ranking entirely and is the honest escape hatch |
| POST | `/feed/refresh` | Force a new slate; rate-limited to 1 per 5 minutes |
| POST | `/topic-mutes` · DELETE `/topic-mutes/:topicKey` | |
| GET | `/topic-mutes` | |
| GET | `/feed/explain/:postId` | The reason payload for one post |
| POST | `/admin/internal/interest-decay/run` | Nightly; decays weights that have not been touched in 30 days and deletes those below 0.01 |
| POST | `/admin/internal/feed-slates/prune` | Hourly; deletes expired slates |

## 8.4 Web and mobile

Feed gains: a `Tabs` control for مرتّب / الأحدث, an end-of-feed state (`EmptyState`, `harvest` kit, copy: «وصلت إلى نهاية ما اخترناه لك اليوم»), a per-post overflow item «لماذا أرى هذا؟» opening a `Dialog`/`Sheet`, and «لا يهمّني» / «إخفاء» actions that write signals.

New shared components: `FeedEndState`, `WhyThisPost`, `TopicChipRow`.

**Signal batching — DECIDED.** The client accumulates signals in memory and flushes on: 25 signals, 30 seconds, app background, or route change — whichever first. On a 2G connection the flush is deferred to the next successful foreground request and piggybacks nothing. Signals are fire-and-forget; a failed flush is dropped, never retried, because a stale dwell signal is worse than no signal.

## 8.5 Privacy

FEED-RANKING.md §9 constrains the DTO. Restated as testable rules: the feed DTO may **never** expose another user's `InterestWeight`, `TopicMute` set, or signal history; `GET /feed/explain/:postId` returns only the viewer's own reason; and `PostStats.uniqueViewers` is an HLL cardinality, so it cannot be reversed into an identity set. A test asserts no `InterestWeight` field appears in any serialised response across the whole route table.

## 8.6 Tests and gates

- Every scoring term as a pure function with a table-driven spec.
- Diversity: a fixture of 40 posts from 3 authors produces no 3-in-a-row.
- Slate stability: two `GET /feed?offset=0` and `?offset=20` calls 60 seconds apart return disjoint, non-duplicating sets.
- Finiteness: offset 120 returns an empty page with `hasMore: false`.
- Explainability: every entry in 200 generated slates has a non-null reason.
- Purity: `check-ranking-purity.mjs` passes; a deliberately-poisoned fixture file fails it.
- Cold start: a zero-weight user gets a 50/30/20 split within ±1 post.
- Performance: slate generation for a viewer with 500 connections and 2,000 candidate posts completes in < 400 ms on the staging shape, asserted in `pnpm load:api:baseline`.
