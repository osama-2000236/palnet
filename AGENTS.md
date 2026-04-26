# AGENTS.md — root instructions for Codex

> Drop this at the **repo root** (same level as `package.json`, `turbo.json`).
> Codex reads it automatically at the start of every session.

You are resuming development of **Baydar** (بيدر) — an Arabic-first professional network, RTL by default, shipped as a Next.js web app and an Expo React Native mobile app out of a Turborepo monorepo.

## Read these first, in order

1. **`DESIGN.md`** — the single source of truth for visual design, components, and screens. Do not deviate.
2. **`BRAND.md`** — product name, voice, do/don't.
3. **`docs/design/RTL.md`** — RTL rules. Non-negotiable.
4. **`docs/design/MOBILE.md`** — mobile-specific overrides to the web design.
5. **`docs/design/prototype/PalNet Prototype.html`** — the working visual ground truth. Open it in a browser when unsure what something should look like. This is the reference, not any old screenshot or LinkedIn mock.

## Hard rules

- **Tokens are the source of truth.** Every color, spacing, radius, font size, shadow comes from `packages/ui-tokens`. Never hardcode a hex, rem, or px. If you need a value that isn't tokenized, add a token first, then consume it.
- **No Tailwind blue.** The brand is olive (`--brand-*`). If you see `blue-500` anywhere in a component, it's a bug.
- **RTL-safe CSS only.** Never `left` / `right` / `margin-left` / `padding-right`. Always `start` / `end` / logical properties. See `docs/design/RTL.md`.
- **Web and mobile stay in lockstep.** When you build a component in `packages/ui-web`, stub the mobile twin in `packages/ui-native` in the same commit. Same prop names, same variant names. Drift is how design systems rot.
- **Arabic is the default.** Every string exists in `ar` first. `en` is a second-class fallback during development. Never ship a hardcoded English string in a component.
- **Differentiate surfaces.** Don't wrap every section in the same `border + rounded + shadow` card. The prototype defines 5 surface variants (`flat`, `card`, `hero`, `tinted`, `row`) — use them intentionally.
- **Avatars everywhere a person appears.** Non-negotiable on a professional network.

## Workflow expectations

- **Before building a screen**, open the prototype section for it and lift the exact layout, spacing, and component composition. Do not reinvent.
- **Before adding a dependency**, check if the monorepo already solves it. We use: Next.js 15 App Router, Prisma, Tailwind, Radix primitives (web), React Native + Expo, Zod, TanStack Query, Lucia auth.
- **Commit discipline**: one component = one PR. Never bundle "added Avatar + fixed auth + tweaked feed" in a single commit.
- **Accessibility is not optional**: every interactive element needs a label, keyboard support, visible focus ring, and a 44pt (mobile) / 40px (web) hit target.

## What to build next

Read `HANDOFF.md` for the current state of the work and the prioritized next tasks.

## When in doubt

1. Check `DESIGN.md` for the decision.
2. If not there, check the prototype (`docs/design/prototype/PalNet Prototype.html`).
3. If still ambiguous, ask the user — don't guess. A one-line question saves a day of rework.

Do not recreate LinkedIn's UI. Baydar is inspired by the category, not the product. If a design decision would make Baydar look like LinkedIn, pick the different one.
