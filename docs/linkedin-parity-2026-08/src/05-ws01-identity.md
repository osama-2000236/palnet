---

# 5. WS-01 — Identity, evidence and the trust spine

## 5.1 What the market forces

Facts §2.1 (diaspora is 1.6× the home market), §2.6 (statutory bodies own credentialing), §2.2 (a 41.3% graduate unemployment rate means a CV is a weak signal because everyone has one), and §2.7 (movement constrains where a person can work).

The conclusion is that **a Baydar profile cannot be a CV**. In a market where 280,000 people in the West Bank alone are looking for work with broadly similar credentials, self-reported history has almost no discriminating power. What discriminates is (a) a statutory licence somebody else issued, (b) finished work a counterparty confirmed, and (c) a named person putting their own reputation behind you. `OCCUPATIONS.md` already reached this conclusion and committed the schema. WS-01 builds the behaviour.

## 5.2 Data

### 5.2.1 New models

```prisma
// Non-statutory training credential. Distinct from Licence (statutory,
// verified against a body) and from Standing (earned from WorkProof).
// Renders as «شهادة» and never as رخصة or معتمد.
model Certificate {
  id           String    @id @default(cuid())
  profile      Profile   @relation(fields: [profileId], references: [id], onDelete: Cascade)
  profileId    String
  name         String
  issuerName   String
  issuerKey    String?   // PS_ISSUERS key when the issuer is known to us
  credentialId String?
  credentialUrl String?
  issuedAt     DateTime?
  expiresAt    DateTime?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  @@index([profileId])
  @@index([issuerKey])
}

model ProfileLanguage {
  profile     Profile           @relation(fields: [profileId], references: [id], onDelete: Cascade)
  profileId   String
  languageKey String            // BCP-47 primary subtag: ar, en, he, fr, tr, de, es
  proficiency LanguageLevel
  @@id([profileId, languageKey])
}

model VolunteerRole {
  id          String    @id @default(cuid())
  profile     Profile   @relation(fields: [profileId], references: [id], onDelete: Cascade)
  profileId   String
  role        String
  organisation String
  causeKey    String?   // PS_CAUSE_KEYS: relief, education, health, heritage, youth, environment
  startDate   DateTime
  endDate     DateTime?
  description String?   @db.Text
  createdAt   DateTime  @default(now())
  @@index([profileId])
}

model Honor {
  id          String    @id @default(cuid())
  profile     Profile   @relation(fields: [profileId], references: [id], onDelete: Cascade)
  profileId   String
  title       String
  issuerName  String
  awardedAt   DateTime?
  description String?   @db.Text
  createdAt   DateTime  @default(now())
  @@index([profileId])
}

model Publication {
  id          String    @id @default(cuid())
  profile     Profile   @relation(fields: [profileId], references: [id], onDelete: Cascade)
  profileId   String
  title       String
  venue       String?
  url         String?
  publishedAt DateTime?
  createdAt   DateTime  @default(now())
  @@index([profileId])
}

// A written testimonial. Distinct from Vouch (sponsors onto the craft ladder,
// costs the voucher capacity if upheld against) and from endorsements (a counter).
model Recommendation {
  id            String               @id @default(cuid())
  author        User                 @relation("RecommendationAuthor", fields: [authorId], references: [id], onDelete: Cascade)
  authorId      String
  subject       User                 @relation("RecommendationSubject", fields: [subjectId], references: [id], onDelete: Cascade)
  subjectId     String
  relationship  RecommendationRelation
  occupationKey String?
  body          String               @db.Text
  status        RecommendationStatus @default(PENDING)
  requestedAt   DateTime?
  respondedAt   DateTime?
  hiddenBySubject Boolean            @default(false)
  createdAt     DateTime             @default(now())
  updatedAt     DateTime             @updatedAt

  @@unique([authorId, subjectId, occupationKey])
  @@index([subjectId, status, hiddenBySubject])
  @@index([authorId])
}

// Identity verification. One row per (user, method). LinkedIn's CLEAR / NFC
// passport paths do not exist here — see §2.4. These four do.
model Verification {
  id          String             @id @default(cuid())
  user        User               @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId      String
  method      VerificationMethod
  status      VerificationStatus @default(PENDING)
  // What was verified: the phone number, the email domain, the body key.
  evidenceRef String
  verifiedAt  DateTime?
  expiresAt   DateTime?
  attempts    Int                @default(0)
  lastAttemptAt DateTime?
  createdAt   DateTime           @default(now())
  updatedAt   DateTime           @updatedAt

  @@unique([userId, method])
  @@index([status, expiresAt])
}

// Short-lived OTP for phone verification and off-platform WorkProof
// confirmation. Hash only — never store the code.
model PhoneOtp {
  id          String    @id @default(cuid())
  phoneE164   String
  codeHash    String
  purpose     OtpPurpose
  refId       String?   // WorkProof id when purpose = WORK_PROOF_CONFIRM
  expiresAt   DateTime
  consumedAt  DateTime?
  attempts    Int       @default(0)
  createdAt   DateTime  @default(now())

  @@index([phoneE164, purpose, expiresAt])
  @@index([expiresAt])
}

// Profile in a second language. The diaspora needs an English profile; the
// local market needs Arabic. One row per non-default locale.
model ProfileTranslation {
  profile   Profile @relation(fields: [profileId], references: [id], onDelete: Cascade)
  profileId String
  locale    String  // "en" only, for now
  firstName String
  lastName  String
  headline  String?
  about     String? @db.Text
  updatedAt DateTime @updatedAt
  @@id([profileId, locale])
}

// Aggregate profile-view counters. NOT per-view rows: at this scale a view
// table is a privacy liability and an index-bloat problem, and §3.1 #25 says
// named viewers are never sold.
model ProfileViewDaily {
  profile         Profile  @relation(fields: [profileId], references: [id], onDelete: Cascade)
  profileId       String
  day             DateTime @db.Date
  views           Int      @default(0)
  // Sparse breakdowns, k-anonymised at read time (k = 5).
  byOccupation    Json?
  byGovernorate   Json?
  @@id([profileId, day])
  @@index([day])
}
```

### 5.2.2 New enums

```prisma
enum LanguageLevel { BASIC CONVERSATIONAL PROFESSIONAL NATIVE }

enum RecommendationRelation {
  MANAGED_DIRECTLY      // كان مسؤولاً عني مباشرة
  REPORTED_TO_ME        // كان يعمل تحت إشرافي
  SAME_TEAM             // زميل في الفريق
  DIFFERENT_TEAM        // زميل في جهة أخرى
  CLIENT_OF             // كنت عميله
  SUPPLIER_TO           // كنت أورّد له
  TAUGHT                // درّسته / درّبته
  STUDIED_UNDER         // تعلّمت على يده
}

enum RecommendationStatus { PENDING PUBLISHED DECLINED WITHDRAWN }

enum VerificationMethod {
  PHONE            // OTP to a Jawwal/Ooredoo number
  WORK_EMAIL       // challenge to an address at the employer's domain
  EDU_EMAIL        // challenge to an address at a PS_UNIVERSITIES domain
  PROFESSIONAL_BODY // manual review against a نقابة register
}

enum VerificationStatus { PENDING VERIFIED FAILED REVOKED EXPIRED }

enum OtpPurpose { PHONE_VERIFY WORK_PROOF_CONFIRM ACCOUNT_RECOVERY }

// Arabic requires grammatical gender agreement in verbs and adjectives
// addressed to the reader. This is not "pronouns" — it is a rendering input.
enum AddressGender { FEMININE MASCULINE NEUTRAL_PLURAL }

enum CareerBreakReason {
  CAREER_BREAK_STUDY
  CAREER_BREAK_CARE
  CAREER_BREAK_HEALTH
  CAREER_BREAK_DISPLACEMENT   // نزوح — specific to this market and not optional
  CAREER_BREAK_DETENTION      // اعتقال — likewise
  CAREER_BREAK_TRAVEL
  CAREER_BREAK_OTHER
}
```

### 5.2.3 Changed models

```prisma
model Profile {
  // ... existing fields unchanged ...

  // Diaspora modelling. `country` already exists and defaults to "PS"; it now
  // means "where this member is", and origin is a separate, optional fact.
  residenceCountry   String   @default("PS")   // ISO-3166-1 alpha-2
  originGovernorate  String?                    // PS_GOVERNORATES key
  diasporaVisible    Boolean  @default(true)    // appear in diaspora discovery

  // Replaces `pronouns` (§19.3). Drives Arabic verb/adjective agreement in
  // every second-person string. NULL renders neutral-plural, which is the safe
  // default in Arabic and what the catalogs already assume.
  addressGender      AddressGender?

  // Career break. A conflict-driven gap must not read as unemployability.
  careerBreakFrom    DateTime?
  careerBreakTo      DateTime?
  careerBreakReason  CareerBreakReason?

  // Cached, recomputed on write. Avoids a five-table fan-out on every card.
  evidenceScore      Int      @default(0)

  certificates       Certificate[]
  languages          ProfileLanguage[]
  volunteerRoles     VolunteerRole[]
  honors             Honor[]
  publications       Publication[]
  translations       ProfileTranslation[]
  viewDays           ProfileViewDaily[]
}

model User {
  // ... existing fields unchanged ...
  phoneVerifiedAt DateTime?
  verifications   Verification[]
  recommendationsWritten  Recommendation[] @relation("RecommendationAuthor")
  recommendationsReceived Recommendation[] @relation("RecommendationSubject")
}

model Skill {
  // ... existing ...
  // Canonicalisation. Free-text skills fragment ("JS", "Javascript",
  // "جافاسكربت") and then endorsements scatter across the fragments.
  canonicalId String?
  canonical   Skill?  @relation("SkillCanonical", fields: [canonicalId], references: [id], onDelete: SetNull)
  aliases     Skill[] @relation("SkillCanonical")
  foldedName  String  // arabicFold(name), unique per canonical cluster
  @@index([foldedName])
  @@index([canonicalId])
}
```

### 5.2.4 Migration order — WS-01

Migrations must be ordered so no step leaves `main` unbootable.

| # | Migration | Notes |
| --- | --- | --- |
| 1 | `add_verification_and_otp` | New tables only. No FK to changed columns. Safe. |
| 2 | `add_profile_sections` | `Certificate`, `ProfileLanguage`, `VolunteerRole`, `Honor`, `Publication`, `ProfileTranslation`. New tables only. |
| 3 | `add_recommendation` | New table + two enums. |
| 4 | `add_profile_diaspora_and_break` | Adds nullable columns to `Profile`. `residenceCountry` gets `DEFAULT 'PS'` and a backfill `UPDATE "Profile" SET "residenceCountry" = "country"`. |
| 5 | `add_address_gender` | Adds `addressGender`; **does not drop `pronouns`** — see §19.3 for the two-release removal. |
| 6 | `add_profile_view_daily` | New table. |
| 7 | `canonicalise_skills` | Adds `Skill.canonicalId`, `Skill.foldedName`; backfill computes `foldedName` with the same folding as `arabic-fold.ts`; a data script clusters exact `foldedName` matches and points aliases at the lowest-`createdAt` member. **`ProfileSkill.endorsements` are summed onto the canonical row and alias rows keep their own counts for rollback.** |
| 8 | `add_evidence_score` | Adds `Profile.evidenceScore` with a backfill of 0; the recompute job fills it. |

## 5.3 Contracts

New modules in `packages/shared/src/schemas/`:

| File | Exports |
| --- | --- |
| `certificate.ts` | `CertificateSchema`, `CreateCertificateBody`, `UpdateCertificateBody`, `Certificate` |
| `recommendation.ts` | `RecommendationSchema`, `RequestRecommendationBody`, `WriteRecommendationBody`, `RespondRecommendationBody`, `RecommendationSummary` |
| `verification.ts` | `VerificationSchema`, `StartVerificationBody`, `ConfirmVerificationBody`, `VerificationBadge` |
| `profile-sections.ts` | `ProfileLanguageSchema`, `VolunteerRoleSchema`, `HonorSchema`, `PublicationSchema` + their create/update bodies |
| `profile-translation.ts` | `ProfileTranslationSchema`, `UpsertProfileTranslationBody` |
| `evidence.ts` | `EvidenceSummary`, `WorkProofSchema`, `CreateWorkProofBody`, `ConfirmWorkProofBody`, `StandingSchema`, `VouchSchema`, `OccupationClaimSchema` |

**DECIDED — `EvidenceSummary` is the one DTO every person-card renders.** It is the answer to "why should I believe this person", computed once server-side and cached on `Profile.evidenceScore`:

```ts
export const EvidenceSummary = z.object({
  confirmedWorkProofs: z.number().int().min(0),
  distinctCounterparties: z.number().int().min(0),
  standing: z.object({ occupationKey: z.string(), value: z.number().int().min(1).max(4) }).nullable(),
  licence: z.object({ bodyKey: z.string(), status: z.enum(["DECLARED","VERIFIED","EXPIRED"]), practice: z.enum(["TRAINEE","PRACTISING","NON_PRACTISING"]) }).nullable(),
  recommendations: z.number().int().min(0),
  verifications: z.array(z.enum(["PHONE","WORK_EMAIL","EDU_EMAIL","PROFESSIONAL_BODY"])),
  ratingAvg: z.number().min(1).max(5).nullable(),   // null below MIN_RATINGS_FOR_AVERAGE (§16.5)
  ratingCount: z.number().int().min(0),
});
```

**DECIDED — the evidence score formula.** `Profile.evidenceScore` is an integer 0–100, used **only for display ordering inside a candidate list the employer already opened**, never in the feed and never in public search. Rule 1 (§4.2) means no paid input touches it.

```
evidenceScore = min(100,
    30 * min(confirmedWorkProofs, 6) / 6
  + 20 * min(distinctCounterparties, 4) / 4
  + 15 * (standing ? standing.value / 4 : 0)
  + 15 * (licence?.status === "VERIFIED" ? 1 : licence ? 0.3 : 0)
  + 10 * min(recommendations, 3) / 3
  + 10 * (verifications.length / 4)
)
```

Recomputed on: `WorkProof` → `CONFIRMED`, `Standing` write, `Licence` status change, `Recommendation` → `PUBLISHED`, `Verification` → `VERIFIED`. Never on read. A nightly reconciliation job recomputes any profile whose `updatedAt` moved without the score moving, and logs a warning if the count is non-zero — that count is the canary for a missed write path.

## 5.4 API

All under `/api/v1`. Every route below must be added to `EXPECTED_ROUTES` in `api-route-coverage.spec.ts`. None is `@Public()`.

| Method | Path | Guard | Rate bucket | Notes |
| --- | --- | --- | --- | --- |
| POST | `/profiles/me/certificates` | JWT | `profile-write` | |
| PUT | `/profiles/me/certificates/:id` | JWT + owner | `profile-write` | |
| DELETE | `/profiles/me/certificates/:id` | JWT + owner | `profile-write` | |
| POST | `/profiles/me/languages` | JWT | `profile-write` | Upsert by `languageKey` |
| DELETE | `/profiles/me/languages/:languageKey` | JWT | `profile-write` | |
| POST | `/profiles/me/volunteer` | JWT | `profile-write` | + PUT/DELETE `/:id` |
| POST | `/profiles/me/honors` | JWT | `profile-write` | + PUT/DELETE `/:id` |
| POST | `/profiles/me/publications` | JWT | `profile-write` | + PUT/DELETE `/:id` |
| PUT | `/profiles/me/translations/:locale` | JWT | `profile-write` | |
| DELETE | `/profiles/me/translations/:locale` | JWT | `profile-write` | |
| GET | `/profiles/me/views` | JWT | `read` | Aggregate only, k=5 |
| POST | `/recommendations/requests` | JWT | `recommendation` | Ask someone to write one |
| POST | `/recommendations` | JWT | `recommendation` | Write one unprompted |
| POST | `/recommendations/:id/respond` | JWT + author | `recommendation` | PUBLISH or DECLINE |
| POST | `/recommendations/:id/withdraw` | JWT + author | `recommendation` | |
| PATCH | `/recommendations/:id/visibility` | JWT + subject | `profile-write` | Subject may hide, never edit |
| GET | `/recommendations/:handle` | JWT | `read` | Published + not hidden |
| POST | `/verifications/phone/start` | JWT | `otp-start` | 3/hour/user, 5/day/phone |
| POST | `/verifications/phone/confirm` | JWT | `otp-confirm` | 5 attempts then the OTP row is burned |
| POST | `/verifications/email-domain/start` | JWT | `otp-start` | Chooses `WORK_EMAIL` or `EDU_EMAIL` by domain match |
| POST | `/verifications/email-domain/confirm` | JWT | `otp-confirm` | |
| POST | `/verifications/body/request` | JWT | `verification-request` | Enters a manual review queue |
| GET | `/verifications/me` | JWT | `read` | |
| POST | `/profiles/me/claims` | JWT | `profile-write` | `OccupationClaim` upsert |
| DELETE | `/profiles/me/claims/:occupationKey` | JWT | `profile-write` | |
| POST | `/work-proofs` | JWT | `work-proof` | Worker requests confirmation |
| POST | `/work-proofs/:id/confirm` | JWT **or** OTP | `work-proof` | On-platform counterparty uses JWT; off-platform uses `PhoneOtp` |
| POST | `/work-proofs/:id/decline` | JWT | `work-proof` | |
| POST | `/work-proofs/:id/dispute` | JWT | `work-proof` | |
| GET | `/work-proofs/me` | JWT | `read` | Both directions, `?role=worker\|client` |
| GET | `/profiles/:handle/evidence` | JWT | `read` | `EvidenceSummary` |
| POST | `/vouches` | JWT | `vouch` | Standing ≥ 3 in the same occupation required |
| DELETE | `/vouches/:id` | JWT + voucher | `vouch` | |
| POST | `/licences` | JWT | `profile-write` | Creates `DECLARED` |
| POST | `/licences/:id/verify-request` | JWT | `verification-request` | Manual queue |
| DELETE | `/licences/:id` | JWT + owner | `profile-write` | |
| GET | `/cv/:handle.pdf` | JWT | `export` | Server-rendered PDF — replaces the print hack, gives mobile a twin |

### 5.4.1 The `Standing` engine — the exact rules

`OCCUPATIONS.md` §2b decides the ladder is 1–4, `CRAFT` track only, never decaying, unpurchasable. It does not state the advancement thresholds. **DECIDED, and this is the whole rule set:**

| To reach | Requires |
| --- | --- |
| **1** — مساعد | An `OccupationClaim` on a `CRAFT`-track occupation. Automatic on claim. Renders as «مهنة معلنة» until any evidence exists. |
| **2** — فني | 3 `CONFIRMED` `WorkProof` rows on that `occupationKey`, from **≥ 2 distinct counterparties**. |
| **3** — فني ماهر | 10 `CONFIRMED` `WorkProof` rows on that `occupationKey`, from **≥ 5 distinct counterparties**, spanning **≥ 180 days** between the earliest and latest `confirmedAt`. |
| **4** — معلّم *(label resolves per family; see below)* | 25 `CONFIRMED` `WorkProof` rows, **≥ 12 distinct counterparties**, **≥ 540 days** span, **and** either two `Vouch` rows from distinct value-4 holders in the same occupation, or one `Recommendation` from a `PROFESSIONAL_BODY`-verified account. |

**Label resolution.** `OCCUPATIONS.md` §2b is explicit that one vocabulary cannot fit every trade — a painter's rung 3 is دهّان ماهر, an electrician's is فني تمديدات كهربائية. Labels resolve from `standingLabelKey(occupationKey, value)` in `packages/shared/src/occupations.ts`, which already exists, into i18n keys `occupations.standing.<familyKey>.<value>`. **The word معلّم is banned as a rung label** — `OCCUPATIONS.md` §1 found 52 occurrences in the Jordanian classification and every one is a teaching title. Rung 4 per family uses the family's own senior form; where none exists, the fallback is `<occupation> + متقدّم`, which matches the nursing ladder's own senior modifier.

**Distinct counterparty** means distinct `clientUserId` OR distinct `clientCompanyId`. A `WorkProof` whose counterparty is the worker themselves is rejected at write time (`DomainException`, `SELF_CONFIRMATION_FORBIDDEN`).

**Idempotency.** `WorkProof` already carries `@@unique([workerId, occupationKey, applicationId])`. That constraint is what stops the exact attack the round-2 review found in Karama: a hire status toggled `HIRED → REJECTED → HIRED` advances nothing the second time. For off-platform proofs `applicationId` is null, so the uniqueness does not bind — **DECIDED:** off-platform proofs additionally require a verified `PhoneOtp` against the counterparty's number, and a partial unique index `(workerId, occupationKey, clientPhoneHash)` where `applicationId IS NULL`. Add `WorkProof.clientPhoneHash String?` for this. This is the SMS-credential dependency `project-spec.md` already flagged; everything before it works on on-platform records alone.

**Suspension.** An upheld report against a `WorkProof` sets `Standing.suspendedAt` and drops the value to the highest rung the remaining confirmed proofs support. Standing does not decay; it is only ever suspended or recomputed downward after evidence is withdrawn. `StandingReason.SUSPENDED` / `DEMOTED` / `REINSTATED` already exist for the audit trail.

**Vouch capacity.** `OCCUPATIONS.md` requires skin in the game. **DECIDED:** a value-4 holder may hold at most **5 active vouches** at once. If a vouchee's `WorkProof` is disputed and the dispute is upheld, the voucher's capacity drops to 0 for **180 days** and every active vouch they hold is flagged for review (not auto-revoked — that would punish the innocent vouchees). Capacity is a computed read over `Vouch` where `revokedAt IS NULL`, plus a `User.vouchSuspendedUntil DateTime?` column.

### 5.4.2 Verification mechanics

**PHONE.** `POST /verifications/phone/start` accepts an E.164 number, normalised for the two Palestinian prefixes: Jawwal `+9705[69]…`, Ooredoo `+9705[6]…`, plus any international number for diaspora members. Generates a 6-digit code, stores `codeHash` (bcrypt cost 10 — cheaper than passwords because the code lives 10 minutes), sends via the SMS provider (§18.4, OWNER-INPUT). 10-minute TTL, 5 attempts, then the row is consumed and a new start is required. On success: `User.phoneVerifiedAt`, `User.phone`, and `Verification(PHONE, VERIFIED)`.

**WORK_EMAIL / EDU_EMAIL.** The user submits an email address. The server decides the method: if the domain matches a `PS_UNIVERSITIES[].domain` entry → `EDU_EMAIL`; if it matches the domain of a `Company` the user has a current `Experience` with (`endDate IS NULL`) → `WORK_EMAIL`; otherwise `DomainException`, `DOMAIN_NOT_ELIGIBLE`, with the two eligible-domain lists in the error `details` so the client can explain. **`PS_UNIVERSITIES` currently has no `domain` field — §5.7 adds it, with all values enumerated in `spec/palestine-universities.delta.ts`.** Verification email goes through the existing Resend transport with a 24-hour signed token, same pattern as `EmailVerificationToken`.

**PROFESSIONAL_BODY.** No public API exists for any of the four bodies, so this is a **manual review queue**, surfaced in the existing `/moderation` admin area as a new tab. The member submits body key + licence number + an uploaded document; a moderator marks it `VERIFIED` or `FAILED` with a note. **OWNER-INPUT:** whether Baydar pursues data-sharing agreements with نقابة المهندسين / نقابة المحامين / PACPA / مجلس مهنة تدقيق الحسابات. The code path is identical either way — an agreement replaces the human with a job, and `Verification.evidenceRef` already carries the body key and number.

**Badge rendering rules — DECIDED, and these are strict because §2.6 says so:**

- A `VERIFIED` `Licence` renders «رخصة مزاولة موثّقة» with the body's name. A `DECLARED` one renders «رخصة معلنة» in `ink-muted` with **no** badge glyph and no colour.
- `موثّق` appears only for identity verification. Never for a licence, never for a standing.
- No badge anywhere renders the words معتمد, مرخّص (about a person), خبير, or محترف. `check-naming.mjs` bans all four as user-facing copy and the i18n gate must fail if they appear in a value in any catalog.

## 5.5 Web

New and changed routes under `apps/web/src/app/[locale]/(app)`:

| Route | Purpose | Surfaces |
| --- | --- | --- |
| `me/edit/certificates` | Certificate list + form | `flat` container, `row` items |
| `me/edit/languages` | Language + proficiency | `flat` + `row` |
| `me/edit/volunteer` | Volunteer roles | `flat` + `row` |
| `me/edit/honors` | Honors | `flat` + `row` |
| `me/edit/publications` | Publications | `flat` + `row` |
| `me/edit/translation` | The English profile | `card` |
| `me/edit/break` | Career break | `card` |
| `me/evidence` | My evidence: proofs, standing, licence, vouches | `hero` header + `flat` sections |
| `me/verification` | Verification hub, four methods | `hero` + four `row` items with state |
| `me/views` | Aggregate profile views | `card` + chart |
| `me/recommendations` | Received / given / requests | `Tabs` + `flat` list |
| `work-proofs` | Confirmation inbox — things awaiting **my** confirmation | `flat` + `row`, empty state `harvest` |
| `in/[handle]` **(changed)** | Adds evidence block, recommendations, certificates, languages, volunteer, honors, publications, career break | see design spec §C.2 |
| `cv/[handle]` **(changed)** | Server-rendered PDF endpoint replaces the print-dialog hack | — |

**The profile page order — DECIDED.** LinkedIn's order is history-first. Baydar's is evidence-first, because §5.1. Top to bottom on `/in/[handle]`:

1. `ProfileHeader` (hero) — avatar, name, headline, occupation claims, governorate, `openToWork`/`acceptingWork`/`hiring` state, one commit action.
2. **Evidence strip** — standing, licence, confirmed-proof count, verification badges. This is above the fold and it is the differentiating surface.
3. Featured work samples (`Post.isWorkSample`) — a horizontal `ScrollView`/rail, images first because for a craft the photo *is* the CV.
4. About.
5. Experience — labelled «خبرة معلنة» per the spine, so it visibly contrasts with confirmed evidence.
6. Recommendations.
7. Skills + endorsements.
8. Education, certificates, languages, volunteer, honors, publications.
9. Career break, if set, rendered inline in the experience timeline as a labelled span, **never as a gap**.

## 5.6 Mobile

Every web route above gets an Expo Router twin under `apps/mobile/app/(app)`:

`me/edit/certificates.tsx` · `me/edit/languages.tsx` · `me/edit/volunteer.tsx` · `me/edit/honors.tsx` · `me/edit/publications.tsx` · `me/edit/translation.tsx` · `me/edit/break.tsx` · `me/evidence.tsx` · `me/verification.tsx` · `me/views.tsx` · `me/recommendations.tsx` · `work-proofs.tsx` · `cv.tsx` (closes `HANDOFF.md` gap #6)

**Mobile CV export — DECIDED.** Web currently uses the browser print dialog as the PDF exporter, which has no mobile equivalent. Rather than build a second renderer, the API gains `GET /cv/:handle.pdf`, rendered server-side. Web switches to it too, so there is one renderer and one RTL shaping implementation. Mobile downloads it with `expo-file-system` and hands it to `expo-sharing`. **This deletes the print-only CSS from `apps/web/src/app/[locale]/cv/page.tsx`** and removes an entire class of RTL-shaping divergence.

**Parity note.** `Tabs` is `⏳` for native in `DESIGN.md` §7.3 but `HANDOFF.md` records the native `Tab` grew `count` + `formatCount` on 2026-07-30 and `check:ui-lockstep` reads 0. `DESIGN.md` §7.3 is stale — **update that table in the same commit**, because a stale parity table is how the next person re-introduces drift.

## 5.7 Shared-data additions

**`packages/shared/src/palestine.ts`:**

- Add the three missing governorates: `salfit` (سلفيت), `tubas` (طوباس), `north-gaza` (شمال غزة).
- Expand `PS_CITIES` from 14 to **93**, enumerated in `spec/palestine-governorates.delta.ts`. Every entry carries `key`, `ar`, `en`, `governorateKey`.
- Add `domain: string | null` to every `PS_UNIVERSITIES` entry, enumerated in `spec/palestine-universities.delta.ts`.
- Add `PS_ISSUERS` — known certificate issuers (universities, MoL TVET centres, syndicate CPD programmes, and the international bodies that actually appear here).
- Add `PS_CAUSE_KEYS` for `VolunteerRole.causeKey`.

**Do not change** `normalizeCity`, `governorateOfCity`, `regionOfGovernorate` or `proximityScore` signatures. They gain data, not behaviour. Their existing specs must still pass unchanged — that is the regression test for this data expansion.

## 5.8 i18n

New namespaces: `evidence`, `verification`, `recommendation`, `certificate`. Extended: `profile`, `me`, `cv`.

Approximately **312 new keys per catalog**, all four catalogs (`apps/web/messages/{ar-PS,en}.json`, `apps/mobile/src/i18n/{ar,en}.json`). Full manifest in `spec/i18n-keys.manifest.json`.

**Arabic register rules for this workstream — DECIDED:**

- Second-person strings use the neutral-plural form unless `Profile.addressGender` is set. `packages/shared/src/format.ts` gains `addressed(key, gender)` and the four catalogs carry `_f` / `_m` variants **only** for the 34 strings where the difference is unavoidable (imperative verbs and predicate adjectives addressed to the member). Everything else stays single-form. Listing all 34 in the manifest is what keeps this from metastasising into a doubled catalog.
- Evidence copy is factual and never congratulatory. «٣ أعمال مؤكَّدة» not «رائع! لديك ٣ أعمال مؤكَّدة».
- `docs/audit/ARABIC-REGISTER-2026-07-25.md` lists 47 colloquial strings awaiting a native-speaker review; **do not add to that list.** Every new string in this workstream is written in the register that document's reviewer settled on. Where it is ambiguous, prefer the Ministry of Labour's own vocabulary (§2.6): تلمذة مهنية, متدرّب, مزاول, حرفة.

## 5.9 Tests and gates

| Test | Location | Asserts |
| --- | --- | --- |
| Standing thresholds | `apps/api/src/modules/evidence/standing.service.spec.ts` | All four rungs, each boundary from both sides, distinct-counterparty rule, span rule, self-confirmation rejection |
| Standing idempotency | same | `HIRED → REJECTED → HIRED` advances once; the off-platform partial unique index blocks a replayed phone confirmation |
| Vouch capacity | `vouch.service.spec.ts` | 5-active cap, 180-day suspension on an upheld dispute, active vouches flagged not revoked |
| Evidence score | `packages/shared/src/evidence-score.spec.ts` | Pure function, every term at 0 and at saturation, total clamps at 100 |
| Ranking purity | `scripts/__tests__/check-ranking-purity.test.mjs` | The gate fails on a file that imports `Subscription` into a ranker |
| OTP | `phone-otp.service.spec.ts` | Hash-only storage, TTL, attempt burn, replay rejection |
| Verification eligibility | `verification.service.spec.ts` | Domain routing to `EDU_EMAIL`/`WORK_EMAIL`, `DOMAIN_NOT_ELIGIBLE` details payload |
| Badge copy | `packages/shared/src/schemas/verification.spec.ts` + i18n gate | No catalog value contains معتمد / مرخّص / خبير / محترف; `موثّق` appears only under `verification.*` |
| Skill canonicalisation | `migrations/__tests__/canonicalise-skills.test.mjs` | Endorsement sums preserved; rollback restores per-alias counts |
| Palestine data | `packages/shared/src/palestine.spec.ts` (extend) | 16 governorates, 93 cities, every city resolves to a governorate, `proximityScore` unchanged for all pre-existing pairs |
| CV PDF | `apps/api/src/modules/cv/cv.controller.spec.ts` + `apps/web/e2e/cv.spec.ts` | Arabic shaping, RTL order, both platforms hit the same endpoint |
| a11y | `apps/web/e2e/a11y.spec.ts` (extend) | Every new route scanned; the evidence strip's semantic tints checked against `muted` and `sunken`, not white |

**Gates that must pass before WS-01 is done:** `pnpm lint:tokens` · `pnpm check:tokens` · `pnpm format:check` · `pnpm lint` · `pnpm type-check` · `pnpm test` · `pnpm check:i18n` · `pnpm check:ui-lockstep` · `pnpm check:naming` · `pnpm test:gates` · `pnpm --filter @baydar/db generate`.
