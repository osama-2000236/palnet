import { chromium } from "playwright";
import { mkdir, writeFile, stat } from "node:fs/promises";
import { join } from "node:path";

const OUT = "design-handoff-2026-05/09-moodboard";

const REFS = [
  {
    slug: "tabby",
    url: "https://tabby.ai/",
    locale: "ar",
    notes: `### tabby (Saudi BNPL)

- URL: https://tabby.ai/ar/SA
- Look at: home page hero + product card row
- Steal: warm earth-tone palette (terracotta + olive feel), Arabic-first typography hierarchy, restraint with whitespace.
- Avoid: BNPL-specific affordances (price + installment math layouts).
- Why: closest cultural-tone match for Baydar — Arabic-native, regional, professional, not SaaS-blue.
`,
  },
  {
    slug: "tamara",
    url: "https://tamara.co/ar",
    locale: "ar",
    notes: `### tamara (Saudi BNPL)

- URL: https://tamara.co/ar
- Look at: merchant directory + checkout flow
- Steal: dense card grid that doesn't feel cramped, badge/tag patterns in Arabic, bilingual typography handling.
- Avoid: heavy product photography style.
- Why: shows how to do "directory + filter" patterns Arabic-first — applicable to Baydar Jobs + Network.
`,
  },
  {
    slug: "linear",
    url: "https://linear.app",
    locale: "en",
    notes: `### linear (anti-SaaS-blue restraint)

- URL: https://linear.app
- Look at: marketing page + in-product issue list
- Steal: typographic restraint, single-accent discipline, dense list with clear hierarchy without visual noise.
- Avoid: the dark mode (Baydar is light-only).
- Why: proves you don't need decoration to feel premium. Counterpoint to LinkedIn bloat.
`,
  },
  {
    slug: "raseef22",
    url: "https://raseef22.net",
    locale: "ar",
    notes: `### raseef22 (Arab journalism)

- URL: https://raseef22.net
- Look at: article layout + section header
- Steal: editorial Arabic typography pairing (display + naskh), how Latin tech terms sit inside Arabic body without clipping.
- Avoid: long-form magazine grid (not applicable to feed).
- Why: real-world stress test for the Baydar mixed-content typography rules in 02-system/RTL.md.
`,
  },
  {
    slug: "careem",
    url: "https://www.careem.com/ar-AE",
    locale: "ar",
    notes: `### careem (Dubai super-app)

- URL: https://www.careem.com/ar-AE
- Look at: home tile grid + booking flow chrome
- Steal: warm color discipline, micro-interactions on tiles, RTL nav chrome.
- Avoid: super-app density (Baydar is single-purpose).
- Why: shows what regional warmth looks like at scale.
`,
  },
];

const browser = await chromium.launch();
const results = [];

for (const ref of REFS) {
  const dir = join(OUT, ref.slug);
  await mkdir(dir, { recursive: true });

  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: ref.locale,
    extraHTTPHeaders: {
      "Accept-Language": ref.locale === "ar" ? "ar,en;q=0.7" : "en,ar;q=0.7",
    },
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  });
  const page = await ctx.newPage();

  try {
    await page.goto(ref.url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(2500);

    const file = join(dir, "screen.png");
    await page.screenshot({ path: file, fullPage: false, timeout: 20000 });
    await writeFile(join(dir, "notes.md"), ref.notes, "utf8");

    const info = await stat(file);
    results.push({ slug: ref.slug, ok: true, kb: Math.round(info.size / 1024) });
    console.log(`OK ${ref.slug}: ${Math.round(info.size / 1024)} KB`);
  } catch (e) {
    results.push({ slug: ref.slug, ok: false, error: e.message });
    console.error(`FAIL ${ref.slug}: ${e.message}`);
  }

  await ctx.close();
}

await browser.close();
console.log("---");
console.log(JSON.stringify(results, null, 2));
