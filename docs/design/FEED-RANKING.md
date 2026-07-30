# FEED-RANKING.md — the interest model and the ranked feed

Decision record. Companions: [`OCCUPATIONS.md`](OCCUPATIONS.md) (the naming spine — every term
here obeys it) and [`MATCHING.md`](MATCHING.md) (the same interest model, applied to jobs).
Written 2026-07-30, owner-approved.

## 0. What exists today, exactly

`apps/api/src/modules/feed/feed.service.ts` is **63 lines**: one indexed query for posts by the
viewer or an `ACCEPTED`-connected peer, `ORDER BY createdAt DESC, id DESC`, cursor-paginated,
blocked users excluded. It is correct, fast and completely blind — it cannot tell an
electrician that someone three connections away is hiring electricians in Jenin.

## 1. The brand constraint, resolved before anything is built

`BRAND.md` says, in as many words: not a casual social network, **no infinite scroll optimized
for engagement, the feed is chronological and finite**. This document replaces "chronological"
and keeps everything else, deliberately:

| Kept                                                                                                      | Changed                                                         |
| --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| **Finite.** A slate is at most 200 posts and ends with a real end-state, «وصلت إلى نهاية الجديد»          | order is by relevance, not recency                              |
| **No engagement maximisation.** The objective is _professional usefulness_, never time-on-app or sessions | a score exists, and it is tuned against usefulness signals only |
| **No dark patterns.** No autoplay, no streaks, no "N people are talking about this" manufactured urgency  | —                                                               |
| **Explainable.** Every ranked post says why it is there                                                   | this is new, and it is the reason ranking is acceptable at all  |

The distinction that makes this coherent: **ranking decides _order_, engagement products decide
_volume_.** Baydar ranks a bounded set well and then stops. `BRAND.md` gets one line changed
in the same PR as the first ranking code, not quietly afterwards.

## 2. Signals

Three groups. Every one is already producible by this stack — no new infrastructure, no
third-party analytics, and PostHog is not in the ranking path.

**Explicit, already stored:** reactions, comments, `Bookmark`, `Repost`, connection accepts,
`Application` submissions, `OccupationClaim`, `JobAlert` filters, follows of a `Company`,
`Report`/block (hard negative).

**Explicit, new and cheap:** «لا يهمّني» (topic + author downweight), «إخفاء المنشور», and
`Occupation`/`Family` interests chosen at onboarding.

**Implicit, needs client instrumentation:** post expand ("عرض المزيد"), link click, dwell
≥ 2s on a post in view, profile visit from a post, and search queries the viewer typed. Batched
client → `POST /v1/signals` (fire-and-forget, rate-limited), never one request per event.

**Never a signal:** message content, who someone messages, profile fields the viewer did not
act on, and anything about a third party's private state. Interaction _existence_ with a person
is allowed; what was said is not.

## 3. The interest model — sparse topics, not embeddings

```
InterestWeight(userId, topicKey, weight, updatedAt)   -- one row per (user, topic)
PostTopic(postId, topicKey, source)                   -- written once, on post create
```

`topicKey` is namespaced: `occ:electrical`, `fam:construction`, `ind:tech`, `co:<companyId>`,
`gov:jenin`, `tag:<hashtag>`. Bounded, human-readable, and joinable in Postgres.

**Tagging a post** is deterministic — no ML, no model to host:

1. the author's `OccupationClaim` keys and their families,
2. hashtags in the body,
3. `Company` mentions and the posting company,
4. folded-Arabic token match against `PS_OCCUPATIONS` — `foldArabic` already exists, so
   "كهربائى" hits `occ:electrical` like "كهربائي" does,
5. the governorate derived from the author's city.

**Updating weights** is an exponentially weighted moving average, applied when a signal lands:

```
w ← w * exp(-Δt / HALF_LIFE) + points(signal)      HALF_LIFE = 21 days
```

Decay-on-read rather than a nightly sweep over every row: cheaper, and a weight is only ever
needed when it is being used. Points, first pass, tuned in one constants object:
apply 10 · comment 5 · save 4 · repost 4 · dwell 1 · expand 1 · profile-visit 2 ·
react 2 · search 3 · «لا يهمّني» −8 · hide −5 · report −20.

**Why not embeddings.** They would rank slightly better and cost a vector store, an embedding
service and the ability to say _why_ a post was shown — and explainability is the thing that
makes a ranked feed brand-compatible here.
`ponytail: sparse topics in Postgres; revisit only if explainability stops being a product requirement.`

## 4. The score

```
score = 0.35 · authorAffinity      // 1st-degree 1.0, 2nd 0.6, followed company 0.5, stranger-in-governorate 0.2
      + 0.30 · topicMatch          // cosine of the post's topic set against the viewer's normalised weights
      + 0.15 · quality             // engagement per impression, Wilson-smoothed, author-independent
      + 0.20 · recency             // exp(-ageHours / 24)
      − 0.25 · fatigue             // seen-before, same-author-already-in-slate, same-topic saturation
      − penalties                  // muted topic, hidden author, low-standing spam heuristics
```

Weights live in one exported object with a comment; nobody tunes them by editing the query.

**τ = 24h, not 2h.** A professional network's useful post stays useful for a day or two; a
short half-life would recreate the churn `BRAND.md` rejects.

**Hard horizon:** nothing older than 14 days enters a slate regardless of score. Keeps the
feed finite and the query bounded.

**Quality must not be gameable.** `quality` is capped per distinct reactor set, ignores
accounts younger than 30 days, and excludes the author's own network from the denominator —
otherwise a ring of five accounts manufactures reach. Same lesson as the Karama minting bug
(`docs/audit/OPUS5-ROUND2-2026-07-25.md`): assume the metric is an attack surface.

## 5. Stable pagination — the problem a lazy design ships broken

Score-ordered results plus a cursor is a bug: scores move between page 1 and page 2, so posts
duplicate and others are skipped. Cursor pagination assumes a stable total order and a ranked
feed does not have one.

```
FeedSlate(id, userId, generatedAt, postIds String[], cursorIndex)
```

- Generated on pull-to-refresh or first load; **TTL 30 minutes**.
- Paging walks an offset into the frozen `postIds` array — stable by construction.
- Posts created after `generatedAt` do **not** reshuffle the slate. They surface through the
  existing SSE channel as a «منشورات جديدة» pill that regenerates the slate when tapped —
  which is also how a user gets control over when the ground moves under them.
- Slate generation is one query with the ranking arithmetic in SQL over the candidate set
  (horizon + graph + topic join), then a bounded re-rank in Node for the diversity pass in §6.
  Candidate set is capped at 500.

## 6. Diversity, serendipity, and the failure mode everyone ships

Raw score ordering produces a feed of nine posts from the one recruiter who posts most. Applied
after scoring, on the slate:

- **Author cap:** at most 2 posts from one author in any window of 10.
- **Topic cap:** at most 4 from one `topicKey` in any window of 10.
- **Serendipity slot:** 1 in every 10 positions is filled from _outside_ the interest model but
  inside the network or governorate. A filter bubble on a professional network means never
  hearing about the trade next door.
- **Fresh-voice floor:** at least 1 in 10 from an author the viewer has not seen in the last
  three slates. New members are otherwise invisible forever, and the network dies from the
  edges in.

## 7. Explainability — required, not a nicety

Every post in a ranked slate carries a reason:

```ts
{ kind: "topic" | "author" | "company" | "governorate" | "serendipity" | "recent",
  label: string }   // «لأنك تتابع أعمال الكهرباء» · «من شبكتك المباشرة» · «قريب منك في جنين»
```

One line, quiet typography, always present. Plus, in settings/privacy: the viewer's own top
topics, **visible and resettable**. If the product cannot say why it showed something, it has
no business showing it — and if the user cannot correct the model, the model is not theirs.

## 8. Cold start

A new member never sees an empty or random feed:

1. onboarding already collects occupation and governorate → seed `InterestWeight` from
   `occ:` + `fam:` + `gov:` at weight 1.0,
2. slate = governorate + family posts + any connections, chronological within score bands,
3. first three sessions bias toward the serendipity and fresh-voice slots, because there is no
   history to exploit yet.

## 9. Privacy, and what the DTO may not do

- Slates and reasons are viewer-scoped → **private / no-store**, per `CLAUDE.md`. A cached
  ranked feed served to the wrong viewer is a data leak, not a cache bug.
- `InterestWeight` is never exposed for another user, never in a public DTO, never in search.
- Signal ingestion is authenticated and rate-limited on the existing Redis limiter.
- Account deletion drops signals and weights with the account; the retention cron already runs.

## 10. How it ships, and how we know it works

No A/B infrastructure exists, so: **flag it.** `FEED_RANKING_ENABLED` per environment, with the
current chronological path intact behind it and both covered by tests. A ranked feed that
cannot be turned off in one env var is a production incident waiting for a bad weight.

Offline evaluation, runnable locally against the QA dataset:

- **Replay:** hide the last N interactions, rank, measure whether the top 5 contains what the
  user actually engaged with. Baseline is the chronological feed — if ranking does not beat it,
  it does not ship.
- **Guardrails, reported next to the win:** distinct authors per slate, distinct topics per
  slate, share of impressions from the serendipity and fresh-voice slots, and «لا يهمّني» rate.
  A relevance gain bought with a diversity collapse is a loss.
- **The metric we refuse to optimise:** session length. It is not in the objective and does not
  belong in the dashboard.

## 11. Phasing — each step useful alone

| Step | Ships                                                                                                                    |
| ---- | ------------------------------------------------------------------------------------------------------------------------ |
| F1   | `PostTopic` + the deterministic tagger + backfill. Feed still chronological — tagging is independently useful for search |
| F2   | `InterestWeight` + `POST /v1/signals` + the negative-feedback actions. Model learns, feed unchanged                      |
| F3   | Scoring + `FeedSlate` + the diversity pass behind `FEED_RANKING_ENABLED`, with the replay harness                        |
| F4   | Reasons in the DTO and the UI line, both platforms, lockstep                                                             |
| F5   | Interest transparency and reset in settings/privacy                                                                      |
| F6   | Tune weights on real data. Nothing before this step pretends the constants are right                                     |
