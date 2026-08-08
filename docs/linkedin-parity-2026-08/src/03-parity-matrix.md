---

# 3. LinkedIn's capability surface, classified

138 capabilities. Each row states what LinkedIn does, what Baydar has today (verified in §1), the verdict, and the workstream that owns it.

**Verdicts:**

| Code | Meaning |
| --- | --- |
| **HAVE** | Already shipped in `main` and adequate. No work. |
| **FIX** | Exists but is defective, unreachable, or has no UI. Repair. |
| **ADD** | Does not exist. Build it. |
| **ADAPT** | The capability is right but LinkedIn's shape is wrong for this market. Build a different shape. |
| **REJECT** | Deliberately not built. A reason is given. Never revisit without a written ADR. |

## 3.1 Identity and profile

| # | LinkedIn capability | Baydar today | Verdict | WS |
| --- | --- | --- | --- | --- |
| 1 | Profile with photo, cover, headline, about | `Profile` complete | HAVE | — |
| 2 | Custom vanity URL | `Profile.handle`, `/in/[handle]` | HAVE | — |
| 3 | Experience | `Experience` | HAVE | — |
| 4 | Education | `Education` | HAVE | — |
| 5 | Skills + endorsements | `Skill`, `ProfileSkill.endorsements` | FIX — free-text `Skill.name` collides with the occupation taxonomy | §5 |
| 6 | Licenses & certifications | `Licence` (statutory only) | ADD — `Certificate` for non-statutory training credentials | §5 |
| 7 | Projects | — | ADD — folds into work samples | §5 |
| 8 | Publications | — | ADD | §5 |
| 9 | Patents | — | REJECT — negligible volume; `Certificate` covers the rare case | — |
| 10 | Courses | — | ADD — merges with Learning enrolments | §12 |
| 11 | Honors & awards | — | ADD | §5 |
| 12 | Volunteer experience | — | ADD — high signal here; NGO sector is large | §5 |
| 13 | Languages | — | ADD — Arabic/Hebrew/English/French proficiency is a real hiring filter | §5 |
| 14 | Causes you care about | — | REJECT — politically loaded in this market; net negative | — |
| 15 | Recommendations (written) | — | ADD | §5 |
| 16 | Featured section | — | ADD — reuses `Post.isWorkSample` | §5 |
| 17 | Open to Work | `Profile.openToWork` | HAVE | — |
| 18 | Open to Hire | `Profile.hiring` | HAVE | — |
| 19 | Providing Services | `Profile.acceptingWork` | FIX — flag exists, no surface | §11 |
| 20 | Creator mode | — | ADAPT — becomes a follower count + newsletter capability, not a mode toggle | §6, §7 |
| 21 | Identity verification | — | ADAPT — no CLEAR/NFC passport path here. Phone OTP + syndicate + university-email + employer-email | §5 |
| 22 | Workplace verification | — | ADD — company-domain email challenge | §5 |
| 23 | Education verification | — | ADD — university-domain email challenge against `PS_UNIVERSITIES` | §5 |
| 24 | Skill assessments | — | REJECT for phase 1 — item banks in Arabic do not exist and a bad assessment is worse than none. `WorkProof` is the evidence primitive | — |
| 25 | Profile views ("who viewed") | — | ADAPT — aggregate + occupation/governorate breakdown for everyone; named viewers **never sold** | §5 |
| 26 | Resume/CV builder + PDF | Web `/cv` print route | FIX — no mobile twin | §5 |
| 27 | Profile in multiple languages | — | ADD — ar/en profile pair; the diaspora needs it | §5 |
| 28 | Career break | — | ADD — critical here; conflict-driven gaps must not read as unemployability | §5 |
| 29 | Top Voice / expert badges | — | REJECT — editorially unownable at this size, and it invents a rank, which OCCUPATIONS.md §0 forbids | — |
| 30 | Pronouns | `Profile.pronouns` | ADAPT — replace with `addressGender`, which Arabic grammar actually requires | §5, §19 |
| 31 | Name pronunciation audio | — | REJECT — low value in a monolingual-name market | — |
| 32 | Standing / craft ladder | `Standing`, `Vouch`, `OccupationClaim` | FIX — schema exists, **no engine** | §5 |
| 33 | Statutory practice licence | `Licence` | FIX — schema exists, **no verification flow** | §5 |

## 3.2 Network graph

| # | LinkedIn capability | Baydar today | Verdict | WS |
| --- | --- | --- | --- | --- |
| 34 | Symmetric connections | `Connection` | HAVE | — |
| 35 | Degree display (1st/2nd/3rd) | — | ADD — needed for referral discovery | §6 |
| 36 | Asymmetric follow | — | ADD — `Follow`; the single biggest graph gap | §6 |
| 37 | Follow a company | — | ADD | §6 |
| 38 | Follow a hashtag/topic | `TopicMute` (negative only) | ADD — `TopicFollow` | §6 |
| 39 | People you may know | `GET /connections/suggestions` | FIX — no occupation/governorate/alumni signals | §6 |
| 40 | Alumni tool | — | ADD — `PS_UNIVERSITIES` already exists | §6 |
| 41 | Contact import / sync | — | REJECT — phone-book upload is a privacy liability in this market and an outsized safety risk for women | — |
| 42 | Invitation with a note | `Connection.message` | HAVE | — |
| 43 | Network counts | `GET /connections/counts` | HAVE (closed 2026-07-30) | — |
| 44 | Block | `BlockedUser` | HAVE | — |
| 45 | Mute / unfollow without disconnecting | — | ADD | §6 |
| 46 | Restrict (limited interaction) | — | ADD — safety-critical | §16 |
| 47 | Diaspora / origin linkage | — | ADD — `Profile.originGovernorate` | §5, §6 |

## 3.3 Content and feed

| # | LinkedIn capability | Baydar today | Verdict | WS |
| --- | --- | --- | --- | --- |
| 48 | Text post | `Post` | HAVE | — |
| 49 | Image post | `Media` | HAVE | — |
| 50 | Video post | `MediaKind.VIDEO` | FIX — no transcoding; 2G makes autoplay indefensible | §7, §15 |
| 51 | Document / carousel post | `MediaKind.DOCUMENT` | FIX — no multi-page renderer | §7 |
| 52 | Poll | — | ADD | §7 |
| 53 | Long-form article | — | ADD | §7 |
| 54 | Newsletter + subscriptions | — | ADD | §7 |
| 55 | Six reactions | `ReactionType` ×6 | HAVE | — |
| 56 | Comments + threaded replies | `Comment` self-relation | HAVE | — |
| 57 | @mentions | `NotificationType.POST_MENTION` exists | FIX — **notification type exists with no mention model and no parser** | §7 |
| 58 | Repost, with or without thought | `Repost.comment` | HAVE | — |
| 59 | Hashtags | `TopicSource.HASHTAG` | FIX — enum member, no extractor | §7 |
| 60 | Ranked feed | Pure reverse-chron | FIX — `FeedSlate`/`InterestWeight`/`PostTopic` unused | §8 |
| 61 | Sort by top / recent | — | ADD — required by FEED-RANKING.md's explainability rule | §8 |
| 62 | "Why am I seeing this?" | — | ADD — mandatory, per FEED-RANKING.md §7 | §8 |
| 63 | Not interested / hide | `SignalKind.NOT_INTERESTED`, `HIDE_POST` | FIX — enum members, no writer | §8 |
| 64 | Post impressions/analytics | — | ADD — aggregate counters, not per-impression rows | §7 |
| 65 | Save a post | `Bookmark` | HAVE | — |
| 66 | Scheduled posts | — | ADD — matters when power and connectivity are intermittent | §7 |
| 67 | Drafts | — | ADD | §7 |
| 68 | Post visibility control | — | ADD — `PostVisibility` | §7 |
| 69 | Comment controls | — | ADD — `Post.commentPolicy` | §7, §16 |
| 70 | Live video | — | REJECT — bandwidth | — |
| 71 | Audio events | — | ADD in §9 as a low-bandwidth event kind | §9 |
| 72 | Collaborative articles (AI-seeded) | — | REJECT — needs an Arabic editorial operation that does not exist | — |
| 73 | Work-sample portfolio | `Post.isWorkSample` | FIX — flag exists, no gallery surface | §5, §7 |

## 3.4 Messaging

| # | LinkedIn capability | Baydar today | Verdict | WS |
| --- | --- | --- | --- | --- |
| 74 | 1:1 messaging | `ChatRoom`, `Message` | HAVE | — |
| 75 | Group messaging | `ChatRoom.isGroup`, `title` | FIX — columns exist, **zero UI on either platform** | §14 |
| 76 | InMail to non-connections | — | ADAPT — becomes employer→candidate outreach with a hard weekly cap, never a consumer upsell | §13, §14 |
| 77 | Message requests / quarantine | — | ADD — safety-critical | §14, §16 |
| 78 | Read receipts, typing | `lastReadAt`, typing events | HAVE | — |
| 79 | Attachments | `Message.mediaUrl` | HAVE | — |
| 80 | Voice messages | — | ADD — high value at low literacy and low bandwidth (32 kbit/s Opus) | §14 |
| 81 | Smart replies / templates | — | ADD — templates only. No generative replies in a hiring context | §14 |
| 82 | Focused / Other inbox | — | ADAPT — becomes Primary / Requests / Archived | §14 |
| 83 | Away message | — | ADD | §14 |
| 84 | Sponsored messaging | — | REJECT — ads in the inbox destroy the trust the scam problem already threatens | — |
| 85 | Scam scanning of outbound messages | — | ADD | §16 |

## 3.5 Jobs — seeker side

| # | LinkedIn capability | Baydar today | Verdict | WS |
| --- | --- | --- | --- | --- |
| 86 | Job search with filters | `GET /jobs`, `GET /search/jobs` | FIX — INNER JOIN drops company-less jobs; no relevance ranking | §17 |
| 87 | Easy Apply | `POST /jobs/:id/apply` | FIX — no profile autofill, no structured application | §10 |
| 88 | Job alerts | `JobAlert` | FIX — free-text `industry`; no occupation or governorate filter | §10 |
| 89 | Saved jobs | `Bookmark` `type=JOB` | HAVE | — |
| 90 | Applied-jobs tracking | `Application.status` | FIX — no seeker-facing tracker screen | §10 |
| 91 | Salary insights | — | ADD — wage opacity is severe here; aggregate, k-anonymous | §10 |
| 92 | Company insights on a job | — | ADD | §10 |
| 93 | Application status with a reason | `RejectionReason` required | HAVE — **better than LinkedIn**; keep | — |
| 94 | Interview prep | — | REJECT phase 1 — content operation, not code | — |
| 95 | Match score, both directions | `Application.matchSnapshot` | FIX — column exists, no scorer | §10 |
| 96 | Referral discovery in-network | — | ADD | §10 |
| 97 | Stored CV | `Application.resumeUrl` | FIX — per-application, not a profile-level document locker | §10 |
| 98 | Screening questions | `Job.screeningQuestions Json` | FIX — untyped JSON, no renderer | §10 |
| 99 | Commute / reachability | `proximityScore` exists | ADD — surface it | §10 |

## 3.6 Hiring — employer side

| # | LinkedIn capability | Baydar today | Verdict | WS |
| --- | --- | --- | --- | --- |
| 100 | Post a job | `POST /companies/:id/jobs` | HAVE | — |
| 101 | Individual posts a job (no company) | `Job.companyId` nullable | FIX — schema ready, **no composer** | §10 |
| 102 | Applicant pipeline | `Application.status` | FIX — flat status, no stages, no notes | §10 |
| 103 | Recruiter seats & projects | — | ADD | §10, §13 |
| 104 | Boolean candidate search | — | ADAPT — structured search over occupation/standing/licence/governorate, not boolean strings | §10, §17 |
| 105 | Talent-pool insights | — | ADD | §10 |
| 106 | Career page | `Company` + `/company/[slug]` | HAVE | — |
| 107 | Showcase pages | — | REJECT — company sizes here do not justify it | — |
| 108 | Hiring-team collaboration | `CompanyMember` + RBAC | FIX — **complete backend, zero UI** | §10 |
| 109 | Interview scheduling | — | ADD — minimal slot proposal, no calendar integration | §10 |
| 110 | ATS integration | — | REJECT — no local ATS market to integrate with | — |
| 111 | Employer verification before posting | `Company.verified` | FIX — boolean exists, no flow, not enforced | §16 |
| 112 | Two-sided rating after a hire | `UserRating` | FIX — backend complete, **zero UI, anti-gaming undecided** | §16 |

## 3.7 Organisations, communities, learning, revenue

| # | LinkedIn capability | Baydar today | Verdict | WS |
| --- | --- | --- | --- | --- |
| 113 | Company pages | `Company` | HAVE | — |
| 114 | Company followers + analytics | — | ADD | §6, §7 |
| 115 | Employee advocacy | — | ADD — light: "share to your feed" from a company post | §7 |
| 116 | Products tab / reviews | — | REJECT — Baydar is not a review site for products | — |
| 117 | Groups | — | ADD — governorate, syndicate, alumni, diaspora | §9 |
| 118 | Events | — | ADD — online-first, because movement is restricted | §9 |
| 119 | Learning courses & paths | — | ADAPT — text/audio micro-lessons, no hosted video | §12 |
| 120 | Learning certificates | — | ADD — issues a `Certificate` | §12 |
| 121 | AI career coach | — | REJECT phase 1 — Arabic quality bar not met, and a wrong answer here costs someone a job | — |
| 122 | Services marketplace | `Profile.acceptingWork` | ADD — listings + inquiries, **no money movement** | §11 |
| 123 | Sponsored content | — | ADD — governorate/occupation targeting, no third-party trackers | §13 |
| 124 | Sponsored jobs | `EmployerCredit.FEATURED_SLOT` | FIX — credit kind exists, no ranking pass reads it | §13 |
| 125 | Campaign manager | — | ADD — minimal | §13 |
| 126 | Lead-gen forms | — | REJECT — a lead-gen form in this market is a data-harvesting vector | — |
| 127 | Sales Navigator | — | REJECT — no B2B sales market of the required size | — |
| 128 | Premium consumer subscription | `PlanCode.USER_PREMIUM` | ADAPT — repriced, and it may never buy visibility | §13 |
| 129 | Employer subscription tiers | `EMPLOYER_BASIC/PRO` | FIX — plans exist, entitlements thin | §13 |
| 130 | Wallet & local payment rails | Enum + env only | FIX — **no adapter for any of the three** | §13 |
| 131 | Multi-currency | `String` currency fields, USD default | FIX — no FX policy, wrong default | §13 |
| 132 | Games | — | REJECT — off-register for the brand and the moment | — |
| 133 | Data export | `GET /account/export` | HAVE | — |
| 134 | Account deletion | Soft delete + restore window | HAVE | — |
| 135 | Notification preferences | `GET/PATCH /me/notification-preferences` | HAVE | — |
| 136 | Email digests | Resend transport exists | ADD — digest composer and cron | §18 |
| 137 | SMS channel | — | ADD — four event types only | §18 |
| 138 | Push | Expo device tokens + fanout | HAVE | — |

## 3.8 Tally

| Verdict | Count | Share |
| --- | --- | --- |
| HAVE | 26 | 19% |
| FIX | 33 | 24% |
| ADD | 51 | 37% |
| ADAPT | 12 | 9% |
| REJECT | 16 | 12% |

**The headline finding of the scan:** 33 capabilities are *already in the schema, the enum set, or the API and have no engine or no UI*. That is nearly a quarter of LinkedIn's surface sitting in this repo as committed intent with no behaviour behind it. The fastest route to a LinkedIn-class product here is not to add features — it is to finish the ones the schema already promises, and only then extend.

§20 orders the phases accordingly: FIX before ADD, everywhere it is possible.
