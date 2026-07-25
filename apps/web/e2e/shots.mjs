// Vision-QA screenshot harvester. Run from apps/web:
//   node <this> [--only=feed,saved] [--viewport=desktop|mobile] [--theme=light|dark] [--locale=ar-PS|en]
// Dumps ds fullPage PNGs to OUT_DIR/<route>__<locale>__<theme>__<viewport>.png
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const API = "http://localhost:4000/api/v1";
const WEB = "http://localhost:3000";
// Repo-relative and gitignored, so the harness works from any checkout.
// Override with QA_SHOTS_OUT to dump elsewhere.
const OUT_DIR = process.env.QA_SHOTS_OUT ?? path.resolve(import.meta.dirname, "../.qa-shots");

const arg = (name, fallback) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split("=").slice(1).join("=") : fallback;
};

const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844 },
};

async function login(email, password) {
  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, deviceId: "qa-vision-shots" }),
  });
  if (!res.ok) throw new Error(`login ${email}: ${res.status} ${await res.text()}`);
  return (await res.json()).data;
}

async function api(session, pathname) {
  const res = await fetch(`${API}${pathname}`, {
    headers: { Authorization: `Bearer ${session.tokens.accessToken}` },
  });
  if (!res.ok) return null;
  return (await res.json()).data;
}

const first = (v) => (Array.isArray(v) ? v[0] : (v?.items?.[0] ?? v?.data?.[0] ?? null));

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const session = await login("demo@baydar.ps", "Password123");

  // Resolve real ids so detail routes render content, not 404s.
  const jobs = await api(session, "/jobs?limit=5");
  const jobId = first(jobs)?.id ?? null;
  const me = await api(session, "/profiles/me");
  const handle = me?.handle ?? "demo";
  // /search is tab-scoped, so ask the companies route directly; the demo seed
  // always has this one, and a null slug silently drops /company from the run.
  const companies = await api(session, "/search/companies?q=%D8%B4&limit=5");
  const companySlug = first(companies)?.slug ?? "qa-tech-co";

  const routes = [
    ["feed", "/feed"],
    ["search", "/search?q=%D9%85%D9%87%D9%86%D8%AF%D8%B3"],
    ["network", "/network"],
    ["notifications", "/notifications"],
    ["messages", "/messages"],
    ["messages-new", "/messages/new"],
    ["saved", "/saved"],
    ["activity", "/activity"],
    ["jobs", "/jobs"],
    jobId ? ["job-detail", `/jobs/${jobId}`] : null,
    jobId ? ["job-public", `/j/${jobId}`] : null,
    ["me", "/me"],
    ["me-edit", "/me/edit"],
    ["me-connections", "/me/connections"],
    ["me-premium", "/me/premium"],
    ["me-karama", "/me/karama"],
    ["profile-public", `/in/${handle}`],
    companySlug ? ["company", `/company/${companySlug}`] : null,
    ["employer", "/employer"],
    ["cv", "/cv"],
    ["settings", "/settings"],
    ["settings-appearance", "/settings/appearance"],
    ["settings-account", "/settings/account"],
    ["settings-privacy", "/settings/privacy"],
    ["settings-notifications", "/settings/notifications"],
    ["settings-security", "/settings/security"],
    ["settings-blocked", "/settings/blocked"],
    ["home", "/"],
    ["legal-terms", "/legal/terms"],
  ].filter(Boolean);

  const only = arg("only", null)?.split(",");
  const picked = only ? routes.filter(([name]) => only.includes(name)) : routes;
  const locales = arg("locale", "ar-PS,en").split(",");
  const themes = arg("theme", "light,dark").split(",");
  const viewports = arg("viewport", "desktop,mobile").split(",");

  const browser = await chromium.launch();
  const failures = [];
  let shot = 0;

  for (const viewport of viewports) {
    for (const locale of locales) {
      for (const theme of themes) {
        const context = await browser.newContext({
          viewport: VIEWPORTS[viewport],
          locale,
          deviceScaleFactor: 1,
          reducedMotion: "reduce",
        });
        await context.addInitScript(
          ({ session, theme }) => {
            window.localStorage.setItem("baydar.session.v1", JSON.stringify(session));
            window.localStorage.setItem("baydar.deviceId", "qa-vision-shots");
            window.localStorage.setItem("baydar-theme", theme);
          },
          { session, theme },
        );
        const page = await context.newPage();
        const consoleErrors = [];
        page.on("console", (m) => {
          if (m.type() === "error") consoleErrors.push(m.text().slice(0, 300));
        });

        for (const [name, route] of picked) {
          const url = `${WEB}/${locale}${route}`;
          const file = path.join(OUT_DIR, `${name}__${locale}__${theme}__${viewport}.png`);
          try {
            await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
            await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
            // Skeletons outlive networkidle (React Query resolves after hydration),
            // so wait for the pulse placeholders to clear before shooting.
            await page
              .waitForFunction(() => document.querySelectorAll(".animate-pulse").length === 0, {
                timeout: 15_000,
              })
              .catch(() => {});
            await page.waitForTimeout(800);
            await page.addStyleTag({ content: "nextjs-portal{display:none !important}" });
            await page.screenshot({ path: file, fullPage: true, animations: "disabled" });
            shot += 1;
            process.stdout.write(`ok  ${path.basename(file)}\n`);
          } catch (error) {
            failures.push({ name, url, error: String(error).slice(0, 200) });
            process.stdout.write(`ERR ${name} ${locale} ${theme} ${viewport}: ${error}\n`);
          }
        }
        await writeFile(
          path.join(OUT_DIR, `_console__${locale}__${theme}__${viewport}.json`),
          JSON.stringify([...new Set(consoleErrors)], null, 2),
        );
        await context.close();
      }
    }
  }

  await browser.close();
  console.log(`\n${shot} shots -> ${OUT_DIR}`);
  if (failures.length) console.log(`failures:\n${JSON.stringify(failures, null, 2)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
