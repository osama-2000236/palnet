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
  const json = await res.json();
  // GET /companies/me answers with a bare array; every other endpoint wraps in
  // { data }. Tolerate both rather than silently resolving undefined.
  return json?.data ?? json;
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

  // Employer + admin surfaces are role-gated, and the auth screens only render
  // signed out — so a route names the session it needs, and we build one browser
  // context per (session × locale × theme × viewport).
  const owner = await login("owner@baydar.ps", "Password123");
  const ownerCompany = first(await api(owner, "/companies/me"));
  const employerSlug = ownerCompany?.slug ?? "baydar";
  // The jobs route keys on company id, not slug — passing the slug 403s with
  // "Not a member of this company", which reads like a permissions problem.
  const employerJobId = ownerCompany?.id
    ? (first(await api(owner, `/companies/${ownerCompany.id}/jobs?limit=5`))?.id ?? null)
    : null;

  // Admin is optional: a checkout without the QA admin user still shoots the
  // other 44 routes instead of dying on login.
  const admin = await login("qa-admin@baydar.test", "Password123").catch(() => null);
  if (!admin) process.stdout.write("warn: no admin session — skipping /moderation + /billing\n");

  const routes = [
    // ── signed in as demo ────────────────────────────────────────────────
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
    ["me", "/me"],
    ["me-edit", "/me/edit"],
    ["me-connections", "/me/connections"],
    ["me-premium", "/me/premium"],
    ["me-karama", "/me/karama"],
    ["profile-public", `/in/${handle}`],
    companySlug ? ["company", `/company/${companySlug}`] : null,
    ["employer", "/employer"],
    ["onboarding", "/onboarding"],
    ["cv", "/cv"],
    ["settings", "/settings"],
    ["settings-appearance", "/settings/appearance"],
    ["settings-account", "/settings/account"],
    ["settings-privacy", "/settings/privacy"],
    ["settings-notifications", "/settings/notifications"],
    ["settings-security", "/settings/security"],
    ["settings-blocked", "/settings/blocked"],
    ["home-authed", "/"],

    // ── signed in as a company owner ─────────────────────────────────────
    ["employer-new", "/employer/new", "owner"],
    ["employer-detail", `/employer/${employerSlug}`, "owner"],
    ["employer-billing", `/employer/${employerSlug}/billing`, "owner"],
    ["employer-job-new", `/employer/${employerSlug}/jobs/new`, "owner"],
    employerJobId
      ? [
          "employer-applicants",
          `/employer/${employerSlug}/jobs/${employerJobId}/applicants`,
          "owner",
        ]
      : null,

    // ── admin ────────────────────────────────────────────────────────────
    admin ? ["admin-moderation", "/moderation", "admin"] : null,
    admin ? ["admin-billing", "/billing", "admin"] : null,

    // ── signed out ───────────────────────────────────────────────────────
    ["home", "/", "anon"],
    ["login", "/login", "anon"],
    ["register", "/register", "anon"],
    ["forgot-password", "/forgot-password", "anon"],
    // Deliberately invalid tokens: the failure state is the screen a user with a
    // stale link actually sees, and it is the only state reachable without
    // minting a live token per run.
    ["reset-password", "/reset-password/invalid-token-for-qa", "anon"],
    ["verify-email", "/verify-email/invalid-token-for-qa", "anon"],
    jobId ? ["job-public", `/j/${jobId}`, "anon"] : null,
    ["legal-tos", "/legal/tos", "anon"],
    ["legal-terms", "/legal/terms", "anon"],
    ["legal-privacy", "/legal/privacy", "anon"],
    ["legal-community", "/legal/community", "anon"],
    ["legal-employer", "/legal/employer", "anon"],
  ]
    .filter(Boolean)
    .map(([name, route, as = "user"]) => [name, route, as]);

  // Access tokens live 15 minutes; a full matrix takes about an hour. Logging in
  // once meant every authenticated route in the last viewport rendered the sign-in
  // page instead — 15 shots, silently, because a login screen is a valid render.
  // The refresh token is an HttpOnly cookie the harness never sees, so it cannot
  // ride the app's own refresh. Mint fresh tokens per context instead.
  const freshSessions = async () => ({
    user: await login("demo@baydar.ps", "Password123"),
    owner: await login("owner@baydar.ps", "Password123"),
    admin: admin ? await login("qa-admin@baydar.test", "Password123").catch(() => null) : null,
    anon: null,
  });

  const only = arg("only", null)?.split(",");
  const picked = only ? routes.filter(([name]) => only.includes(name)) : routes;
  const locales = arg("locale", "ar-PS,en").split(",");
  const themes = arg("theme", "light,dark").split(",");
  const viewports = arg("viewport", "desktop,mobile").split(",");

  const browser = await chromium.launch();
  const failures = [];
  let shot = 0;

  const authTags = [...new Set(picked.map(([, , as]) => as))];

  for (const viewport of viewports) {
    for (const locale of locales) {
      for (const theme of themes) {
        const sessions = await freshSessions();
        for (const as of authTags) {
          const forThisTag = picked.filter(([, , tag]) => tag === as);
          const context = await browser.newContext({
            viewport: VIEWPORTS[viewport],
            locale,
            deviceScaleFactor: 1,
            reducedMotion: "reduce",
          });
          await context.addInitScript(
            ({ session, theme }) => {
              // anon contexts get the theme but no session, so the auth screens
              // and the public landing render signed out.
              if (session) {
                window.localStorage.setItem("baydar.session.v1", JSON.stringify(session));
                window.localStorage.setItem("baydar.deviceId", "qa-vision-shots");
              }
              window.localStorage.setItem("baydar-theme", theme);
            },
            { session: sessions[as], theme },
          );
          const page = await context.newPage();
          const consoleErrors = [];
          page.on("console", (m) => {
            if (m.type() === "error") consoleErrors.push(m.text().slice(0, 300));
          });

          for (const [name, route] of forThisTag) {
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
            path.join(OUT_DIR, `_console__${as}__${locale}__${theme}__${viewport}.json`),
            JSON.stringify([...new Set(consoleErrors)], null, 2),
          );
          await context.close();
        }
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
