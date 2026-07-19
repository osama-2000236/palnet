# Screen Critique — post-critique surfaces (2026-07-19)

Phase 1 of the design-upgrade plan: the surfaces that shipped after the
2026-05-21 critique (`open-design-screen-critique.md`), scored on the same
five dimensions (philosophy / hierarchy / detail / functionality / restraint,
ship gate ≥7). Evidence gathered on the local QA stack (Arabic RTL desktop,
Arabic RTL 390px, English LTR spot-pass); no horizontal overflow found on any
route at 390px.

Scores are **post-fix**: the engineering-fixable findings below were fixed in
the same pass (branch `claude/ponytail-ultra-33a172`); pre-fix scores in
parentheses where a fix moved the number.

## Web routes

| Route                      | Philosophy | Hierarchy | Detail | Functionality | Restraint | Notes                                                                    |
| -------------------------- | ---------- | --------- | ------ | ------------- | --------- | ------------------------------------------------------------------------ |
| `/me/premium` + checkout   | 8          | 8         | 7 (5)  | 8 (5)         | 8         | Honest method gating incl. bank rail; IBAN recoverable from invoice row. |
| `/saved`                   | 8          | 7         | 8      | 7             | 8         | Illustration empty state; no type filter yet — fine at current volume.   |
| `/company/[slug]` (public) | 8          | 8         | 8 (7)  | 8             | 8         | Verified badge, jobs w/ chips; country now localized (فلسطين, not PS).   |
| `/jobs` (+filters, alerts) | 8          | 8         | 8 (6)  | 8             | 8         | Arabic count pluralized; alert guard copy honest; save buttons labeled.  |
| `/jobs/[id]` (+share)      | 8          | 8         | 8      | 8             | 9         | WhatsApp-first share; native share sheet fallback + copy toast.          |
| `/j/[id]` (public share)   | 9          | 8         | 7      | 8             | 9         | Right anatomy, full OG meta; `og:image` missing (deferred, needs asset). |
| `/cv` (export)             | 7          | 7         | 7      | 7             | 9         | Empty sections hidden honestly; print/save affordance clear.             |
| admin `/moderation`        | 7          | 7 (5)     | 8 (5)  | 8 (6)         | 8         | Names/avatars + typed targets replace raw cuids; enums translated.       |
| admin `/billing`           | 7          | 7 (6)     | 8 (6)  | 8             | 8         | One attribution line per scope; filter-aware empty; action toasts.       |

All rows now clear the ≥7 gate.

## Findings fixed in this pass

1. **Bank-transfer placeholder leak (trust boundary).** With
   `BANK_TRANSFER_IBAN` unset, checkout rendered the literal
   `CONFIGURE_BANK_IBAN` to a paying user. Root-cause fix in the contract:
   `BillingCatalog.bankTransfer` (destination or null), API refuses
   bank-transfer checkouts while unconfigured, both clients render the method
   disabled — "قريبًا" — like the wallet tiles.
2. **Transfer details unrecoverable.** IBAN + reference existed only in the
   one-shot checkout response; reload lost them. Open bank invoices now
   re-render beneficiary/IBAN/reference (from the catalog + invoice id) on
   web and native invoice lists.
3. **Moderation queue was id-soup.** Reporter cuid + target cuid → reporter
   avatar + name/handle (API already shipped them; fallback keeps the id in a
   tooltip) and a typed target label (منشور/تعليق/حساب/رسالة). Reason and
   decision enums (SPAM, DISMISS) now localized.
4. **Tab-blind empty states.** Moderation "resolved" tab and billing
   PAID/VOID/ALL filters showed the open-queue empty copy.
5. **No action feedback.** Both queues act silently; rows just vanished.
   Success toast added (`تم — {action}`).
6. **Billing attribution noise.** Every row printed both scopes
   ("الشركة: غير متوفر" on personal invoices). One line per scope now.
7. **Arabic plural broken on jobs count.** "9 وظيفة" → ICU plural
   ("٩ وظائف", dual and zero handled).
8. **Raw ISO country on company page.** "رام الله, PS" →
   `Intl.DisplayNames` ("رام الله، فلسطين").
9. **Dead component.** `me/premium/_components/PremiumCheckout.tsx` — stale
   byte-copy of the shared `CheckoutPanel`, zero importers. Deleted.

## Deliberate non-fixes

- **Admin dialect copy** ("ما في بلاغات", "بدك تحذف"). Kept: the admin queues
  are internal, single-operator surfaces and the Palestinian register is an
  intentional voice choice there. Product-facing copy stays MSA.
- **`og:image` on `/j/[id]`** — needs a designed share-card asset; a wrong
  image is worse than text-only. Pass 2 mock scope.
- **Native `window.confirm`/`prompt` idiom in admin actions** — honest and
  functional for a solo operator; revisit only if operators multiply.
- **`role="switch"` on jobs filter pills** — works and is labeled; ARIA
  purists would use toggle buttons. Not worth churn until the component is
  next touched.

## Residual (out of engineering scope — Pass 2 mocks)

- Trust cues and plan-comparison hierarchy on `/me/premium` (ask item 1) —
  the flows are honest and complete; the _persuasion_ layer (social proof,
  guarantee copy, comparison emphasis) was never designed.
- Operator scan-speed layout for the queues at >1 operator scale
  (ask item 2) — row density, keyboard flow, bulk actions.
- Where the restored Illustration `outline`/`block` kits get used — a
  differentiation decision (e.g., outline kit for admin/internal surfaces),
  not an engineering default.

## Evidence

- QA stack: local API + web dev servers, `qa-admin@baydar.test` operator,
  seeded report fixtures, real checkout-session → invoice flow.
- Checks: bank method disabled when rail unconfigured; invoice row shows
  transfer details when configured (code path verified by props; env-off path
  verified live); moderation reason/target/decision localized live; billing
  filtered-empty copy live; "٩ وظائف" live; "رام الله، فلسطين" live.
- Gates: type-check 13/13, lint clean, tests api 307 / shared 34 / web 24 /
  ui-web 21 / mobile 93, lint-tokens + qa-design + release-placeholders clean.
