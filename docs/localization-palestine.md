# Localization — Palestine First

The product is Arabic-first. Every default behavior assumes `ar-PS` + RTL. English is the secondary language for diaspora users, recruiters posting in English, and international contacts.

## Locale Codes & Direction

| Code | Direction | Use |
| --- | --- | --- |
| `ar-PS` | rtl | **Default.** Arabic (Palestine). |
| `en` | ltr | Secondary. Used when user explicitly picks it or when no Arabic translation exists. |

Locale is stored on `User.locale` (Prisma default `"ar-PS"`) and echoed in `Content-Language`. Clients pick locale in this order: user setting → `Accept-Language` → `ar-PS`.

## Copy Rules

- Every JSX/TSX string that a user can read must be `t('namespace.key')`. No literal strings in components. Enforced by an eslint rule in Phase 1 once onboarding copy stabilizes.
- Namespaces mirror the route/screen: `auth`, `feed`, `profile`, `network`, `messaging`, `notifications`, `jobs`, `company`, `common`.
- Keys live in:
  - Web: `apps/web/messages/ar.json`, `apps/web/messages/en.json` (loaded by `next-intl`).
  - Mobile: `apps/mobile/src/i18n/ar.json`, `apps/mobile/src/i18n/en.json` (loaded by `i18next` + `expo-localization`).
- Same keys must exist on both platforms — CI fails if a key is missing on either side once the script is added.

## Voice & Tone

- Professional, warm, second person.
- Avoid slang. Use Modern Standard Arabic (فصحى عصرية), not Palestinian dialect, for UI — dialect is fine in user-generated content.
- Address the user with gender-neutral verbs where possible. When a gendered form is unavoidable, provide two keys (`key.masc`, `key.fem`) and pick based on `Profile.pronouns` if set; otherwise default masculine.

## Numbers, Dates, Currency

- **Numerals:** Arabic-Indic digits by default in `ar-PS` (٠١٢٣٤٥٦٧٨٩). Use `Intl.NumberFormat('ar-PS')`. Accept both Arabic-Indic and Western digits in inputs; normalize to Western before persisting.
- **Dates:** Gregorian calendar with Arabic month names. `Intl.DateTimeFormat('ar-PS', { dateStyle: 'medium' })`.
- **Relative time:** `Intl.RelativeTimeFormat('ar-PS')` — e.g. `منذ ٣ دقائق`.
- **Currency:** Default `ILS` for jobs. Allow `USD`, `JOD`, `EUR` explicitly. Always render with the ISO code next to the number (`٥٠٠٠ ILS`) to avoid symbol ambiguity.
- **Phone numbers:** E.164. Palestinian default prefix `+970`. Validate with `libphonenumber-js` when phone is introduced.

## RTL Implementation

- **HTML root:** `<html lang="ar-PS" dir="rtl">` on `ar-PS`, `lang="en" dir="ltr"` on `en`. Wire via `next-intl` middleware.
- **Mobile:** call `I18nManager.forceRTL(true)` once at boot when locale is `ar-PS`, persist, and reload if it changes.
- **CSS:** Tailwind logical properties only. Banned: `ml-*`, `mr-*`, `left-*`, `right-*`, `pl-*`, `pr-*`, `text-left`, `text-right`. Allowed: `ms-*`, `me-*`, `start-*`, `end-*`, `ps-*`, `pe-*`, `text-start`, `text-end`.
- **Icons:** do not mirror icons except navigation chevrons, progress arrows, and back/forward affordances.
- **Text fields:** Arabic input direction auto-detected; mixed-language posts require `dir="auto"` per paragraph.
- **Forms:** labels above inputs, not inline — avoids RTL/LTR label jitter.

## Palestinian Context

- Default `country = "PS"` for `Profile` and `Company`.
- Cities enum (drop-down source of truth for job posting + profile location): القدس (Jerusalem), رام الله (Ramallah), نابلس (Nablus), الخليل (Hebron), غزة (Gaza), خان يونس (Khan Younis), بيت لحم (Bethlehem), جنين (Jenin), طولكرم (Tulkarm), قلقيلية (Qalqilya), أريحا (Jericho), رفح (Rafah), دير البلح (Deir al-Balah), بيت جالا (Beit Jala). Allow free-text for diaspora cities.
- Universities list (for education field): Birzeit, An-Najah, Islamic University of Gaza, Al-Quds, Bethlehem, Hebron, Palestine Polytechnic, Arab American University, Al-Azhar (Gaza), Palestine Technical. Allow free-text.
- Holidays & calendar considerations for notifications (avoid push during: الجمعة العظيمة, عيد الفطر, عيد الأضحى, رمضان pre-iftar window for evening digest).

## Testing Requirements

- Any page/screen PR touches must run visually in both RTL and LTR in Playwright/Detox screenshot tests.
- Jest tests for any utility that formats numbers/dates assert both locales.

## What NOT to do

- Do not auto-translate user-generated content.
- Do not default to English on any screen.
- Do not use emoji as a communication affordance in system copy (ok in user content).
- Do not use Hijri dates for business transactions (messages, jobs, posts). Reserve Hijri for explicit date pickers users ask for.
