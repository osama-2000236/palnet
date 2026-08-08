# Design Handoff Bundle — Execution Plan

> Target: assemble complete handoff package for Claude Design.
> Audience: AI executor (no judgment calls except where tagged `[HUMAN]`).
> Reviewer: project lead validates each task gate before next phase starts.
> All paths relative to repo root: `C:\LinkedIn\.claude\worktrees\eloquent-yonath-6c4db3`.

## Conventions

- `INPUT` = files to read before acting.
- `DO` = exact command or write action. Copy-paste runnable.
- `OUT` = exact output path(s).
- `VERIFY` = exact check that proves done.
- `[HUMAN]` = needs human input. Pause, ask, then continue.
- All commands run from repo root in PowerShell unless noted.
- Never invent values. If a value missing, stop and ask.

---

## Phase 0 — Bundle scaffold

### T0.1 Create bundle root

DO:

```powershell
$root = "design-handoff-2026-05"
New-Item -ItemType Directory -Force -Path "$root\01-brand","$root\02-system","$root\03-components","$root\04-screens","$root\05-prototype","$root\06-fixtures","$root\07-audits","$root\09-moodboard" | Out-Null
```

OUT: 9 empty dirs at repo root under `design-handoff-2026-05/`.

VERIFY:

```powershell
Get-ChildItem design-handoff-2026-05 -Directory | Measure-Object | Select-Object -ExpandProperty Count
```

Expect `9`.

---

## Phase A — Copy existing artifacts (no transformation)

### T-A.1 Brand pack

DO:

```powershell
Copy-Item BRAND.md design-handoff-2026-05\01-brand\BRAND.md
```

OUT: `design-handoff-2026-05/01-brand/BRAND.md`.

VERIFY: file exists, size matches source.

### T-A.2 Design system pack

DO:

```powershell
Copy-Item DESIGN.md design-handoff-2026-05\02-system\DESIGN.md
Copy-Item docs\HANDOFF.md design-handoff-2026-05\02-system\HANDOFF.md
Copy-Item docs\design\RTL.md design-handoff-2026-05\02-system\RTL.md
Copy-Item docs\design\MOBILE.md design-handoff-2026-05\02-system\MOBILE.md
Copy-Item docs\design\NAV.md design-handoff-2026-05\02-system\NAV.md
Copy-Item docs\design\PARITY.md design-handoff-2026-05\02-system\PARITY.md
Copy-Item docs\design\SCREENS.md design-handoff-2026-05\02-system\SCREENS.md
Copy-Item packages\ui-tokens\src\index.ts design-handoff-2026-05\02-system\tokens.ts
Copy-Item packages\ui-tokens\src\tokens.css design-handoff-2026-05\02-system\tokens.css
Copy-Item packages\ui-tokens\src\tokens.native.ts design-handoff-2026-05\02-system\tokens.native.ts
```

OUT: 10 files in `02-system/`.

VERIFY:

```powershell
(Get-ChildItem design-handoff-2026-05\02-system -File | Measure-Object).Count
```

Expect `10`.

### T-A.3 Component spec pack

DO:

```powershell
Copy-Item docs\components\*.md design-handoff-2026-05\03-components\
New-Item -ItemType Directory -Force -Path "design-handoff-2026-05\03-components\src-web","design-handoff-2026-05\03-components\src-native" | Out-Null
Copy-Item packages\ui-web\src\*.tsx design-handoff-2026-05\03-components\src-web\
Copy-Item packages\ui-native\src\*.tsx design-handoff-2026-05\03-components\src-native\
```

OUT: 6 spec md + all `*.tsx` from both ui packages.

VERIFY:

```powershell
(Get-ChildItem design-handoff-2026-05\03-components\src-web -Filter *.tsx).Count
(Get-ChildItem design-handoff-2026-05\03-components\src-native -Filter *.tsx).Count
```

Expect `>=11` web, `>=14` native.

### T-A.4 Prototype pack

DO:

```powershell
Copy-Item -Recurse "docs\_archive\prototype-2025\*" design-handoff-2026-05\05-prototype\
```

OUT: full prototype tree under `05-prototype/`.

VERIFY:

```powershell
Test-Path design-handoff-2026-05\05-prototype\"Baydar Prototype.html"
Test-Path design-handoff-2026-05\05-prototype\components\AppShell.jsx
```

Both `True`.

### T-A.5 Screen-level current code

DO:

```powershell
$screens = "feed","jobs","messages","network","notifications","search","onboarding","settings"
foreach ($s in $screens) {
  $dst = "design-handoff-2026-05\04-screens\$s"
  New-Item -ItemType Directory -Force -Path "$dst\web","$dst\mobile" | Out-Null
}
# Web pages — copy whole route trees
Copy-Item -Recurse "apps\web\src\app\[locale]\(app)\feed\*" design-handoff-2026-05\04-screens\feed\web\
Copy-Item -Recurse "apps\web\src\app\[locale]\(app)\jobs\*" design-handoff-2026-05\04-screens\jobs\web\
Copy-Item -Recurse "apps\web\src\app\[locale]\(app)\messages\*" design-handoff-2026-05\04-screens\messages\web\
Copy-Item -Recurse "apps\web\src\app\[locale]\(app)\network\*" design-handoff-2026-05\04-screens\network\web\
Copy-Item -Recurse "apps\web\src\app\[locale]\(app)\notifications\*" design-handoff-2026-05\04-screens\notifications\web\
Copy-Item -Recurse "apps\web\src\app\[locale]\(app)\search\*" design-handoff-2026-05\04-screens\search\web\
Copy-Item -Recurse "apps\web\src\app\[locale]\(app)\onboarding\*" design-handoff-2026-05\04-screens\onboarding\web\
Copy-Item -Recurse "apps\web\src\app\[locale]\(app)\settings\*" design-handoff-2026-05\04-screens\settings\web\
# Mobile screens
Copy-Item "apps\mobile\app\(app)\feed.tsx" design-handoff-2026-05\04-screens\feed\mobile\
Copy-Item -Recurse "apps\mobile\app\(app)\jobs\*" design-handoff-2026-05\04-screens\jobs\mobile\
Copy-Item -Recurse "apps\mobile\app\(app)\messages\*" design-handoff-2026-05\04-screens\messages\mobile\
Copy-Item "apps\mobile\app\(app)\network.tsx" design-handoff-2026-05\04-screens\network\mobile\
Copy-Item "apps\mobile\app\(app)\notifications.tsx" design-handoff-2026-05\04-screens\notifications\mobile\
Copy-Item "apps\mobile\app\(app)\search.tsx" design-handoff-2026-05\04-screens\search\mobile\
Copy-Item "apps\mobile\app\(app)\onboarding.tsx" design-handoff-2026-05\04-screens\onboarding\mobile\
Copy-Item -Recurse "apps\mobile\app\(app)\settings\*" design-handoff-2026-05\04-screens\settings\mobile\
```

OUT: per-screen `web/` + `mobile/` source trees.

VERIFY:

```powershell
Get-ChildItem design-handoff-2026-05\04-screens -Recurse -Filter *.tsx | Measure-Object | Select-Object -ExpandProperty Count
```

Expect `>=16`.

### Phase A REVIEW GATE

Reviewer checks:

- [ ] All 10 system files present.
- [ ] All 6 component spec md files present.
- [ ] Web ui src + native ui src copied.
- [ ] Prototype dir intact.
- [ ] All 8 screen folders populated for both platforms.

---

## Phase B — Build missing artifacts

### T-B.1 [HUMAN] Pain inventory

INPUT: project lead opens current web + mobile app, walks every screen.

DO: Lead writes free-form list. Format per item:

```
- screen: {feed|profile|...}
  area: {hero|composer|empty|right-rail|...}
  problem: {one sentence what feels wrong}
  severity: {high|med|low}
```

OUT: `design-handoff-2026-05/08-pain.md`.

VERIFY: file exists, ≥10 items, each item has all 4 fields.

NOTE: AI cannot do this. Block downstream tasks until done.

### T-B.2 Token-drift audit

DO:

```powershell
pnpm install --frozen-lockfile
pnpm lint:tokens 2>&1 | Tee-Object design-handoff-2026-05\07-audits\tokens-lint.txt
```

OUT: `design-handoff-2026-05/07-audits/tokens-lint.txt`.

VERIFY: file non-empty. Exit code 0 = clean. Non-zero = drift logged in file.

### T-B.3 Hardcoded-value sweep (supplemental to tokens lint)

DO:

```powershell
# Hex literals outside tokens package
Select-String -Path "apps\web\src\**\*.tsx","apps\web\src\**\*.ts","apps\mobile\src\**\*.tsx","apps\mobile\src\**\*.ts","packages\ui-web\src\**\*.tsx","packages\ui-native\src\**\*.tsx" -Pattern '#[0-9a-fA-F]{3,8}\b' -SimpleMatch:$false 2>$null | Select-Object Path,LineNumber,Line | ConvertTo-Json -Depth 3 | Out-File design-handoff-2026-05\07-audits\hex-hits.json -Encoding utf8
```

OUT: `design-handoff-2026-05/07-audits/hex-hits.json`.

VERIFY: file exists. Empty array = clean. Hits = candidates for tokenization.

### T-B.4 Parity matrix (real, not stub)

DO:

```powershell
$web = Get-ChildItem packages\ui-web\src -Filter *.tsx | Where-Object { $_.Name -notmatch '^(safety|cx|jsx)' } | Select-Object -ExpandProperty BaseName
$nat = Get-ChildItem packages\ui-native\src -Filter *.tsx | Where-Object { $_.Name -notmatch '^(safety|cx|jsx|tokens)' } | Select-Object -ExpandProperty BaseName
$all = ($web + $nat) | Sort-Object -Unique
$rows = foreach ($n in $all) {
  $w = if ($web -contains $n) { "yes" } else { "no" }
  $m = if ($nat -contains $n) { "yes" } else { "no" }
  "| $n | $w | $m |"
}
@"
# Parity Matrix (generated)

| Component | Web | Native |
| --- | --- | --- |
$($rows -join "`n")
"@ | Out-File design-handoff-2026-05\07-audits\parity-matrix.md -Encoding utf8
```

OUT: `design-handoff-2026-05/07-audits/parity-matrix.md`.

VERIFY: file exists, has table with ≥1 row per component.

### T-B.5 A11y baseline (existing axe sweep)

DO:

```powershell
# In separate terminal: pnpm --filter @baydar/api dev
# In separate terminal: pnpm --filter @baydar/web dev
# Then:
pnpm --filter @baydar/web exec playwright test e2e/a11y.spec.ts --reporter=json --output=design-handoff-2026-05\07-audits\axe-results 2>&1 | Tee-Object design-handoff-2026-05\07-audits\axe-run.log
```

OUT: `axe-results/` dir + `axe-run.log`.

VERIFY:

- Log mentions each route in `e2e/a11y.spec.ts`.
- Note: if API/DB not bootstrapped locally, capture log of which routes failed setup. Do not skip task — partial coverage still useful.

### T-B.6 Screenshot atlas — web

INPUT: dev servers running (api on `:4000`, web on `:3000`).

DO: Create capture script.

Write file `scripts/capture-snapshots.mjs`:

```javascript
// Captures every route at 3 viewports x 2 locales x N states.
// Runs against running web dev server. Auth fixture must be seeded first.
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

const OUT = "design-handoff-2026-05/04-screens";
const VIEWPORTS = [
  { name: "desktop", w: 1440, h: 900 },
  { name: "tablet", w: 1024, h: 768 },
  { name: "mobile", w: 375, h: 812 },
];
const LOCALES = ["ar-PS", "en"];
const ROUTES = [
  { screen: "feed", path: "/feed", authed: true },
  { screen: "jobs", path: "/jobs", authed: true },
  { screen: "messages", path: "/messages", authed: true },
  { screen: "network", path: "/network", authed: true },
  { screen: "notifications", path: "/notifications", authed: true },
  { screen: "search", path: "/search", authed: true },
  { screen: "onboarding", path: "/onboarding", authed: true },
  { screen: "settings", path: "/settings", authed: true },
  { screen: "auth-login", path: "/login", authed: false },
  { screen: "auth-register", path: "/register", authed: false },
];

async function loadAuth(context) {
  // Reuse the playwright auth fixture if present.
  const path = "apps/web/tests/.auth/storageState.json";
  const fs = await import("node:fs/promises");
  try {
    const raw = await fs.readFile(path, "utf8");
    const state = JSON.parse(raw);
    await context.addCookies(state.cookies ?? []);
    for (const o of state.origins ?? []) {
      await context.addInitScript((entries) => {
        for (const e of entries) localStorage.setItem(e.name, e.value);
      }, o.localStorage ?? []);
    }
  } catch {
    console.warn("auth state not found; authed routes will redirect to /login");
  }
}

const browser = await chromium.launch();
for (const vp of VIEWPORTS) {
  for (const locale of LOCALES) {
    const ctx = await browser.newContext({
      viewport: { width: vp.w, height: vp.h },
      locale,
    });
    await loadAuth(ctx);
    const page = await ctx.newPage();
    for (const r of ROUTES) {
      const url = `http://localhost:3000/${locale}${r.path}`;
      const dir = join(OUT, r.screen, "web");
      await mkdir(dir, { recursive: true });
      try {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
        await page.waitForTimeout(1500);
        await page.screenshot({
          path: join(dir, `${vp.name}-${locale}-default.png`),
          fullPage: true,
        });
      } catch (e) {
        console.error(`FAIL ${url}: ${e.message}`);
      }
    }
    await ctx.close();
  }
}
await browser.close();
console.log("done");
```

Run:

```powershell
node scripts\capture-snapshots.mjs
```

OUT: `design-handoff-2026-05/04-screens/{screen}/web/{viewport}-{locale}-default.png` for every combo.

VERIFY:

```powershell
(Get-ChildItem design-handoff-2026-05\04-screens -Recurse -Filter *.png).Count
```

Expect `60` (10 routes × 3 viewports × 2 locales). Less = capture failures; check log.

NOTE: only captures `default` state. Loading/empty/error states require app fixtures not yet wired — log as gap in `08-pain.md`.

### T-B.7 Screenshot atlas — mobile

INPUT: physical / simulator with Expo dev build running.

DO: `[HUMAN]` because Expo + simulator orchestration not scriptable cross-platform here.

Lead manually captures every mobile screen on iOS simulator (iPhone 15) + Android emulator (Pixel 7) for both `ar-PS` and `en`. Save as:
`design-handoff-2026-05/04-screens/{screen}/mobile/{ios|android}-{locale}-default.png`.

OUT: 8 screens × 2 platforms × 2 locales = 32 PNGs minimum.

VERIFY:

```powershell
(Get-ChildItem design-handoff-2026-05\04-screens -Recurse -Filter "*ios*.png","*android*.png").Count
```

Expect `>=32`.

### T-B.8 Realistic Arabic content fixtures

DO: Write `design-handoff-2026-05/06-fixtures/content.json`:

```json
{
  "names": {
    "short_ar": "سارة",
    "long_ar": "عبد الرحمن بن عبد العزيز",
    "single_letter_ar": "ن",
    "mixed": "Layla خالد"
  },
  "headlines": {
    "short_ar": "مهندسة برمجيات",
    "medium_ar": "مهندسة برمجيات أولى في شركة تقنية فلسطينية",
    "long_ar": "قائدة فريق المنتج والتصميم والتجربة في إحدى الشركات الناشئة في رام الله، أعمل على بناء منتجات للسوق العربي",
    "mixed": "Full Stack Engineer · React · Node.js · PostgreSQL"
  },
  "post_bodies": {
    "one_line_ar": "اليوم انضممتُ إلى فريق جديد. شكراً لكل من دعمني.",
    "paragraph_ar": "بعد سنتين من العمل عن بُعد، عدتُ إلى المكتب اليوم. الفرق محسوس: اللقاءات العفوية، والنقاشات السريعة على فنجان قهوة، والشعور بأنك جزء من فريق حقيقي. لا أقول إن العمل عن بُعد سيّئ، لكن للحضور قيمته.",
    "mixed": "جربتُ Next.js 15 هذا الأسبوع. الـ App Router أصبح أكثر استقراراً، والـ Server Actions أنظف من قبل. لكن TypeScript لا يزال يشتكي من types/* في بعض الحالات."
  },
  "numerals": {
    "arabic_indic": "١٢٣٤٥",
    "western": "12345",
    "in_sentence_ar": "شارك ١٢٤ شخصاً",
    "in_sentence_mixed": "شارك 124 شخصاً"
  },
  "edge_cases": {
    "long_handle": "@abdulrahman-product-designer-ramallah",
    "url_in_arabic": "زوروا الموقع https://baydar.app للمزيد",
    "rtl_then_ltr_then_rtl": "نشرتُ مقالاً عن React في مجلة العربية",
    "very_long_post": "[paste 500-word Arabic post here once human reviews — placeholder]"
  }
}
```

OUT: `design-handoff-2026-05/06-fixtures/content.json`.

VERIFY: valid JSON, all 5 top-level keys present.

NOTE: `very_long_post` placeholder requires `[HUMAN]` final pass with native speaker.

### T-B.9 [HUMAN] Competitive moodboard

INPUT: lead curates 3-5 references (Careem, Tabby, Tamara, Noon, Linear-restraint, etc.).

DO: For each ref, save:

- `design-handoff-2026-05/09-moodboard/{name}/screen.png`
- `design-handoff-2026-05/09-moodboard/{name}/notes.md` — 3 bullets: what to steal, what to avoid, why relevant.

OUT: ≥3 named subdirs.

VERIFY: `(Get-ChildItem design-handoff-2026-05\09-moodboard -Directory).Count -ge 3`.

### T-B.10 Token-driven fixtures bundle

DO: Generate token quick-reference card.

```powershell
node -e "const t = require('./packages/ui-tokens/src/index.ts'); console.log(JSON.stringify(t.tokens, null, 2));" 2>$null
# If above fails (TS not transpiled), use compiled output:
Copy-Item packages\ui-tokens\src\tokens.css design-handoff-2026-05\06-fixtures\tokens-quickref.css
```

OUT: `06-fixtures/tokens-quickref.css`.

VERIFY: file exists.

### Phase B REVIEW GATE

Reviewer checks:

- [ ] `08-pain.md` has ≥10 items, all 4 fields each.
- [ ] `07-audits/tokens-lint.txt` exists.
- [ ] `07-audits/hex-hits.json` exists.
- [ ] `07-audits/parity-matrix.md` lists every shared component.
- [ ] `07-audits/axe-run.log` exists (even if partial).
- [ ] Web snapshots ≥60 PNGs OR documented capture failures in pain.md.
- [ ] Mobile snapshots ≥32 PNGs.
- [ ] `06-fixtures/content.json` valid + content fully Arabic.
- [ ] `09-moodboard/` ≥3 references with notes.

---

## Phase C — Frame the design problems

### T-C.1 Specific design problems doc

DO: Write `design-handoff-2026-05/08-problems.md` listing the 10 weak spots from analysis (already enumerated below — copy verbatim, then `[HUMAN]` adds repo-specific notes).

Content to write (verbatim, then enrich):

```markdown
# Design Problems — Confirmed Targets

1. SCREENS.md is a stub. No per-screen recipe matrix. Risks composition drift.
2. Dark mode undecided. Either ship light-only or scope dark.
3. Empty-state illustrations missing across all 8 screens.
4. Profile cover gradient: only allowed decorative gradient, palette unspecified.
5. Five surface variants likely under-utilized; scan needed for "every section as card" anti-pattern.
6. Mobile Tabs primitive: not started.
7. Web Sheet primitive: not started.
8. Logo: still placeholder SVG.
9. Onboarding flow: not in DESIGN.md.
10. No motion vocabulary doc — durations exist in tokens, choreography unspecified.

## Repo-specific addenda

[HUMAN: add findings from pain.md grouped here]
```

OUT: `design-handoff-2026-05/08-problems.md`.

VERIFY: file exists with both sections.

---

## Phase D — Bundle structure README

### T-D.1 Bundle entry point

DO: Write `design-handoff-2026-05/00-README.md`:

```markdown
# Baydar Design Handoff — May 2026

## Read order

1. `01-brand/BRAND.md` — what Baydar is, voice, anti-patterns.
2. `02-system/DESIGN.md` — visual system, non-negotiables.
3. `02-system/RTL.md` + `MOBILE.md` + `NAV.md` — constraints.
4. `02-system/tokens.{ts,css,native.ts}` — token source of truth.
5. `03-components/` — shipped component specs + source.
6. `04-screens/{screen}/web,mobile` — per-screen source + snapshots.
7. `05-prototype/Baydar Prototype.html` — visual ground truth.
8. `06-fixtures/content.json` — realistic Arabic content for testing.
9. `07-audits/` — token drift, parity, a11y baseline.
10. `08-pain.md` + `08-problems.md` — what hurts today.
11. `09-moodboard/` — competitive references (anti-LinkedIn).
12. `10-ask.md` — explicit deliverable.

## Hard constraints (do not violate)

- Olive primary `#526030`, terracotta accent `#a8482c`. Never blue.
- RTL first. Logical CSS only. See `02-system/RTL.md`.
- Tokens are the only source of values.
- Arabic-first copy.
- Five surface variants — use intentionally, never nest cards.
- 44pt mobile / 40px web minimum hit target.
- Visible focus ring: 2px `--brand-600`, 2px offset.
```

OUT: `design-handoff-2026-05/00-README.md`.

VERIFY: file exists, references all 9 numbered dirs.

---

## Phase E — Sequence checkpoint

### T-E.1 Status report

DO: Write `design-handoff-2026-05/STATUS.md` listing per task: id, status (`done|blocked|gap`), blocker if any.

OUT: `design-handoff-2026-05/STATUS.md`.

VERIFY: every T-\* id from this plan appears once.

---

## Phase F — The ask

### T-F.1 [HUMAN] Pick scope

INPUT: lead picks 2-3 from problem list (T-C.1) for first design pass.

DO: Write `design-handoff-2026-05/10-ask.md`:

```markdown
# Ask for Claude Design — Pass 1

## In scope (this pass)

1. [HUMAN: pick 1, e.g. "Redesign empty states across all 8 screens, with illustration direction"]
2. [HUMAN: pick 2]
3. [HUMAN: pick 3, optional]

## Out of scope (future passes)

- [list rest from 08-problems.md]

## Constraints (must respect)

- All hard rules from 00-README.md.
- Tokens only. Propose new tokens if needed; never inline values.
- Web + mobile parity. Every component change ships both twins.
- Arabic-first. Show Arabic mocks first, English second.
- Deliver: per-screen redesign mock + token diff + component diff + rationale (≤200 words each).

## Deliverables expected back

- `design-out/{problem}/mock-{screen}-{platform}-{locale}.png`
- `design-out/{problem}/token-diff.md`
- `design-out/{problem}/component-changes.md`
- `design-out/{problem}/rationale.md`
```

OUT: `design-handoff-2026-05/10-ask.md`.

VERIFY: file exists, ≥1 in-scope item, ≥1 out-of-scope item.

---

## Final review (lead acts as team leader)

### Cross-bundle gate

Run from repo root:

```powershell
$bundle = "design-handoff-2026-05"
$required = @(
  "00-README.md",
  "01-brand\BRAND.md",
  "02-system\DESIGN.md","02-system\tokens.ts","02-system\tokens.css","02-system\tokens.native.ts",
  "02-system\RTL.md","02-system\MOBILE.md","02-system\NAV.md","02-system\PARITY.md","02-system\SCREENS.md","02-system\HANDOFF.md",
  "03-components\src-web","03-components\src-native",
  "04-screens\feed\web","04-screens\feed\mobile",
  "05-prototype\Baydar Prototype.html",
  "06-fixtures\content.json",
  "07-audits\tokens-lint.txt","07-audits\parity-matrix.md","07-audits\hex-hits.json",
  "08-pain.md","08-problems.md",
  "09-moodboard",
  "10-ask.md","STATUS.md"
)
$missing = $required | Where-Object { -not (Test-Path "$bundle\$_") }
if ($missing.Count -eq 0) { "READY" } else { "MISSING:`n" + ($missing -join "`n") }
```

Expect: `READY`.

### Sign-off checklist

- [ ] All Phase A copies match source byte-for-byte.
- [ ] All Phase B audits ran without hidden errors.
- [ ] Snapshot atlas covers every shipped screen.
- [ ] Pain inventory written by human, not invented.
- [ ] Moodboard avoids LinkedIn refs.
- [ ] Ask is concrete, scoped 2-3 items, not "improve everything".
- [ ] Token, RTL, parity constraints repeated in 00-README.md and 10-ask.md.

---

## Execution order

Strict sequence. Don't parallelize across phases.

1. T0.1 (scaffold)
2. T-A.1 → T-A.5 (parallel OK)
3. **GATE: Phase A review**
4. T-B.1 [HUMAN] → unblocks rest
5. T-B.2, T-B.3, T-B.4 (parallel OK, scripted)
6. T-B.5 (needs dev servers)
7. T-B.6 (needs dev servers + auth fixture)
8. T-B.7 [HUMAN] (mobile manual)
9. T-B.8, T-B.9 [HUMAN], T-B.10 (parallel OK)
10. **GATE: Phase B review**
11. T-C.1
12. T-D.1
13. T-E.1
14. T-F.1 [HUMAN]
15. **GATE: Final review**

## When AI hits ambiguity

Stop. Write a question to `design-handoff-2026-05/QUESTIONS.md` in format:

```
- [task-id] {one-sentence question}
```

Continue with next independent task. Do not guess.
