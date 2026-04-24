# BRAND.md — Baydar

> Location in repo: **root**.

## The name

**Baydar** (بيدر) — _baidar_, the **threshing floor**: the shared ground where farmers bring their harvest to be sorted, measured, and traded. It's the village's public commercial surface.

Why this name for a professional network:

1. **The metaphor does the work.** You bring what you've built. You're seen, sorted, valued, connected. That's what a professional network _is_.
2. **Regional without being literal.** It's unmistakably Arabic and agrarian, but it doesn't name a place, a group, or a cliché.
3. **Bilingual-friendly.** One syllable stress (**BAY**-dar). Latin speakers pronounce it correctly on first try. Arabic readers recognize it instantly.
4. **Not taken in tech.** No Baydar-branded social / professional product as of now.

## Pronunciation

- Arabic: **بَيْدَر** — _bay-dar_ (short final a, emphasis on first syllable).
- Latin transliteration: **Baydar**. Not _Baidar_, not _Beydar_. Keep one spelling across every surface.

## Applied name — do and don't

- ✅ Baydar (product name, always capitalized like a proper noun)
- ✅ بيدر (Arabic, no diacritics in UI, diacritics only in logo lockup)
- ❌ baydar (lowercase) — only in URLs, handles, package names
- ❌ "The Baydar" — not an article-noun, it's a name
- ❌ "Baydar App" / "Baydar Network" — the name stands alone

## Tagline options (pick one when you're ready)

- **ar:** «حيث يلتقي أثرك بفرصتك.» — "where your work meets your chance."
- **ar:** «شبكتك، بلغتك.» — "your network, in your language."
- **en:** "The professional network for the Arab world."
- **en:** "Bring your work to the floor."

Default to Arabic. Use English only on localized surfaces.

## Voice

- **Warm, direct, unflashy.** We explain what a feature does in one sentence, then show it.
- **Arabic-first in copy.** Every string is written in Arabic by someone who thinks in Arabic. English is a translation, never the other way around.
- **No hype.** No "revolutionary," no "the future of," no "reimagined."
- **Professional, not corporate.** "نشر منشوراً" not "قام بنشر منشور."

## Logo

- **Mark:** a stylized **ب** (Arabic letter _ba_) inside a squared, gently rounded frame. The letter evokes _baydar_'s first character and reads as a tight, grounded glyph.
- **Colors:** frame in `--brand-600` (`#526030`), letter reversed to white. Never colored reverse (white frame, olive letter) — only the positive lockup.
- **Do not** stylize the letter into a more decorative shape — calligraphic, swash, or hand-drawn. Keep it geometric.
- **Clear space:** 1× logo height on all sides. Min size: 20px (favicon), 32px (header).

The prototype ships a working SVG placeholder in `components/primitives.jsx` (`case "logo"`). Replace with the final mark when designed, but keep the same proportions and container.

## Colors

See `DESIGN.md §3`. The brand color is **olive `#526030`**. The accent is **terracotta `#a8482c`**. That's it.

## Typography

See `DESIGN.md §3`. IBM Plex Sans Arabic + Noto Naskh Arabic + IBM Plex Mono.

## Naming things in code

- Repo: `baydar`
- npm scope: `@baydar`
- Packages: `@baydar/ui-tokens`, `@baydar/ui-web`, `@baydar/ui-native`, `@baydar/api`, `@baydar/db`
- Apps: `apps/web` (Next), `apps/mobile` (Expo)
- Web app meta: title `Baydar — بيدر`, description in Arabic first
- Deep links: `baydar://` scheme on mobile
- Database name: `baydar`
- Env prefix: `BAYDAR_` for non-standard vars

## Domain + handle checklist

Claim before launch:

- [ ] `baydar.app` / `baydar.co` / `baydar.ps`
- [ ] `@baydar` on Twitter/X, Instagram, Threads
- [ ] `baydar` on Product Hunt
- [ ] Apple Developer account + App Store app name reservation
- [ ] Google Play app name reservation
- [ ] `@baydar` npm org scope

## What Baydar is not

- Not a LinkedIn clone. We design for Arabic first, we differentiate with regional warmth, we cut features LinkedIn bloats (stories, audio rooms, newsletters).
- Not a dating product. No "meet new people" framing.
- Not a casual social network. No infinite scroll optimized for engagement. The feed is chronological and finite.
- Not B2B SaaS. We talk to people, not "organizations" or "stakeholders."
