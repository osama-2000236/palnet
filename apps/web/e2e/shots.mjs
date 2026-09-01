// Vision-QA screenshot harvester. Run from apps/web:
//   node <this> [--only=feed,saved] [--viewport=desktop|mobile] [--theme=light|dark] [--locale=ar-PS|en]
//              [--state=default|empty|error|offline|loading|long]
// Dumps ds fullPage PNGs to OUT_DIR/<route>__<locale>__<theme>__<viewport>.png
//
// `--state` forces a condition the seeded happy path never reaches. Without it
// the matrix only ever photographs whatever the database happens to contain,
// which is why the empty, error, offline and loading screens had never been
// looked at on any surface. Non-default states suffix the filename
// (`feed__empty__ar-PS__light__mobile.png`) so they sort beside their twin.
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

// Ports are overridable so a second worktree can shoot its own stack without
// colliding with whatever is already on 3000/4000.
const API = process.env.QA_SHOTS_API ?? "http://localhost:4000/api/v1";
const WEB = process.env.QA_SHOTS_WEB ?? "http://localhost:3000";
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

// ── Forced states ──────────────────────────────────────────────────────────
// One route handler per state, installed on the page before the first
// navigation. They work on shape rather than on an endpoint allowlist: an
// allowlist goes stale the moment a route is added, and a stale allowlist here
// fails the same silent way the harness already failed four times — the shot
// looks fine, it just is not the state you asked for.

const LONG = {
  // 61 characters. Real Palestinian naming plus a compound family name is the
  // realistic worst case, not a lorem string.
  name: "عبد الرحمن محمد عبد الله الشريف الحسيني المقدسي الفلسطيني",
  // A job title with no spaces cannot wrap, so it is the one that breaks a
  // fixed-width card. 54 characters.
  title: "SeniorStaffSoftwareEngineeringManagerPlatformInfra",
  paragraph: `${"الشبكة المهنية العربية الأولى في فلسطين تبني جسرًا بين الكفاءات المحلية وفرص العمل الحقيقية. ".repeat(8)}`,
};

/** Deep-map every array under `data` to empty, whatever the envelope shape. */
function emptied(body) {
  if (Array.isArray(body)) return [];
  if (body && typeof body === "object") {
    const out = {};
    for (const [k, v] of Object.entries(body)) {
      if (Array.isArray(v)) out[k] = [];
      else if (v && typeof v === "object") out[k] = emptied(v);
      else if (k === "hasMore") out[k] = false;
      else if (k === "nextCursor") out[k] = null;
      else if (/count$/i.test(k) && typeof v === "number") out[k] = 0;
      else out[k] = v;
    }
    return out;
  }
  return body;
}

/** Grow every string that looks like a name/title/body to a stress length. */
function lengthened(body) {
  if (Array.isArray(body)) return body.map(lengthened);
  if (body && typeof body === "object") {
    const out = {};
    for (const [k, v] of Object.entries(body)) {
      if (typeof v === "string" && v.length > 0) {
        if (/^(firstName|lastName|name|companyName|school)$/.test(k)) out[k] = LONG.name;
        else if (/^(title|headline|tagline)$/.test(k)) out[k] = LONG.title;
        else if (/^(body|about|description|coverLetter)$/.test(k)) out[k] = LONG.paragraph;
        else out[k] = v;
      } else if (/^(logoUrl|avatarUrl|coverUrl)$/.test(k)) {
        out[k] = null; // the company with no logo, the person with no photo
      } else if (v && typeof v === "object") {
        out[k] = lengthened(v);
      } else {
        out[k] = v;
      }
    }
    return out;
  }
  return body;
}

async function installState(page, state) {
  // `offline` is not a route handler. Aborting requests does not touch
  // `navigator.onLine` and does not fire the `offline` event, which is the
  // only thing `useOnline` listens for — so an abort-based "offline" never
  // renders `ConnectivityBanner` and is indistinguishable from `error`.
  // Applied per route after navigation in the loop below, because a page that
  // is offline before `goto` cannot load its own HTML.
  if (state === "default" || state === "offline") return;
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    // Auth must keep working or every route photographs the sign-in page —
    // exactly the failure that made 15 shots worthless last time.
    if (request.url().includes("/auth/")) return route.continue();
    // SSE endpoints (`@Sse("stream")` → /notifications/stream, /messaging/stream)
    // never close, so `route.fetch()` below hangs and its callback outlives the
    // page — the whole harness threw here. They carry a `?token=` query, so match
    // the pathname, not the full URL. Nothing to reshape; pass through like auth.
    if (new URL(request.url()).pathname.endsWith("/stream")) return route.continue();

    if (state === "error") {
      if (request.method() !== "GET") return route.continue();
      return route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: { code: "INTERNAL", message: "Forced QA failure" } }),
      });
    }
    if (state === "loading") {
      // Never resolve. The screenshot below is taken on a timer, so this is
      // what holds the skeleton on screen long enough to photograph.
      return new Promise(() => {});
    }

    // empty / long need the real response to reshape.
    const response = await route.fetch();
    const text = await response.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      return route.fulfill({ response });
    }
    const transformed = state === "empty" ? emptied(json) : lengthened(json);
    return route.fulfill({
      response,
      contentType: "application/json",
      body: JSON.stringify(transformed),
    });
  });
}

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
  // Employer + admin surfaces are role-gated, and the auth screens only render
  // signed out — so a route names the session it needs, and we build one browser
  // context per (session × locale × theme × viewport).
  const owner = await login("owner@baydar.ps", "Password123");
  const ownerCompany = first(await api(owner, "/companies/me"));
  const employerSlug = ownerCompany?.slug ?? "baydar";
  // The public company page shoots the owner's company. This used to run a
  // full-text search for "ش" and fall back to a hardcoded `qa-tech-co` — a
  // slug that only ever existed as leftover fixture debris, and once that was
  // swept the route silently shot a 404 page instead of a company. Seeded
  // membership is the one thing guaranteed to resolve.
  const companySlug = employerSlug;
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
  const state = arg("state", "default");
  if (!["default", "empty", "error", "offline", "loading", "long"].includes(state)) {
    throw new Error(`unknown --state=${state}`);
  }
  // Signed-out routes have no data to empty, break or delay, so a forced state
  // just re-photographs the same landing page 20 more times.
  const picked = (only ? routes.filter(([name]) => only.includes(name)) : routes).filter(
    ([, , as]) => state === "default" || as !== "anon",
  );
  const locales = arg("locale", "ar-PS,en").split(",");
  const themes = arg("theme", "light,dark").split(",");
  const viewports = arg("viewport", "desktop,mobile").split(",");

  const suffix = state === "default" ? "" : `__${state}`;
  const browser = await chromium.launch();
  const failures = [];
  const overflows = [];
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
          await installState(page, state);
          const consoleErrors = [];
          page.on("console", (m) => {
            if (m.type() === "error") consoleErrors.push(m.text().slice(0, 300));
          });

          for (const [name, route] of forThisTag) {
            const url = `${WEB}/${locale}${route}`;
            const file = path.join(
              OUT_DIR,
              `${name}${suffix}__${locale}__${theme}__${viewport}.png`,
            );
            try {
              await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
              if (state === "offline") {
                // Offline means "the app was running and the network went
                // away", and that needs the app to be RUNNING first. Cutting
                // the connection at `domcontentloaded` cut it before the JS
                // chunks had been fetched: every `--state=offline` shot was a
                // page whose scripts never arrived — no hydration, no data
                // request, no listeners — recorded as if it were the app under
                // a lost connection. `net::ERR_INTERNET_DISCONNECTED` on
                // `_next/static/chunks/*` in the console capture is the tell.
                //
                // So settle first, exactly as the default state does, and only
                // then pull the cable.
                await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
                await page
                  .waitForFunction(
                    () =>
                      document.querySelectorAll(".animate-pulse").length === 0 &&
                      document.querySelectorAll('[aria-busy="true"]').length === 0,
                    { timeout: 15_000 },
                  )
                  .catch(() => {});
                await context.setOffline(true);
                // `setOffline` stops the requests and NOTHING ELSE: it does not
                // flip `navigator.onLine` in the page and it does not fire the
                // `offline` event, which is the only thing `useOnline` listens
                // for. So the state this file exists to photograph — the
                // connectivity banner over a degraded screen — never appeared in
                // a single `--state=offline` shot; every one was a plain
                // request-failure page under a different name. Dispatching the
                // event is what the browser would have done. Verified by hand:
                // with the event, `ConnectivityBanner` renders "أنت غير متصل…";
                // without it, `navigator.onLine` stays true.
                await page.evaluate(() => {
                  Object.defineProperty(navigator, "onLine", {
                    configurable: true,
                    get: () => false,
                  });
                  window.dispatchEvent(new Event("offline"));
                });
                await page.waitForTimeout(1_500);
              } else if (state === "loading") {
                // networkidle never arrives when the API never answers, and
                // waiting for skeletons to clear is the opposite of the point.
                await page.waitForTimeout(1_500);
              } else {
                await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
                // Skeletons outlive networkidle (React Query resolves after
                // hydration), so wait for the placeholders to clear.
                //
                // `aria-busy` as well as `.animate-pulse`: not every loading
                // state is a skeleton. `/me` is a redirect stub that renders a
                // plain "جارِ التحميل…" line while it resolves the handle, so
                // the pulse condition was satisfied instantly and the matrix
                // photographed the interstitial as if it were the profile
                // screen — silently, because a loading line is a valid render.
                // That is the fifth time this harness has lied in exactly this
                // shape. The app already marks these regions `aria-busy`, so
                // the signal cost nothing to add.
                await page
                  .waitForFunction(
                    () =>
                      document.querySelectorAll(".animate-pulse").length === 0 &&
                      document.querySelectorAll('[aria-busy="true"]').length === 0,
                    { timeout: 15_000 },
                  )
                  .catch(() => {});
                await page.waitForTimeout(800);
              }
              await page.addStyleTag({ content: "nextjs-portal{display:none !important}" });

              // Measure BEFORE screenshotting. `fullPage: true` resizes the
              // viewport internally to capture the whole page, and measuring
              // afterwards reads that resized layout — which reported /me/edit
              // as 526px in a 390px viewport when a standalone check at the
              // same URL, at four settle times, saw a clean 390.
              //
              // Horizontal overflow is invisible in the screenshot anyway: the
              // image just grows to fit it.
              const overflow = await page.evaluate(() => {
                const doc = document.documentElement;
                if (doc.scrollWidth <= doc.clientWidth) return null;
                // RTL overflows to the LEFT (negative x), LTR to the right. A
                // detector that only checks `right > clientWidth` finds nothing
                // on an Arabic page and calls every RTL screen clean.
                //
                // Elements scrolled out of a horizontal scroller (the nav is
                // `overflow-x-auto` by design) also sit outside the viewport but
                // do not widen the document, so skip anything a scrolling
                // ancestor already clips — otherwise every screen reports the
                // nav as guilty.
                const clipped = (el) => {
                  for (let p = el.parentElement; p && p !== doc; p = p.parentElement) {
                    if (/auto|scroll|hidden/.test(getComputedStyle(p).overflowX)) return true;
                  }
                  return false;
                };
                const guilty = [...document.querySelectorAll("body *")]
                  .filter((el) => {
                    const r = el.getBoundingClientRect();
                    if (r.left >= -1 && r.right <= doc.clientWidth + 1) return false;
                    return !clipped(el);
                  })
                  .slice(0, 5)
                  .map((el) =>
                    `${el.tagName.toLowerCase()}.${el.getAttribute("class") || "(no class)"}`.slice(
                      0,
                      120,
                    ),
                  );
                return { scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth, guilty };
              });
              if (overflow) overflows.push({ name, locale, theme, viewport, ...overflow });

              await page.screenshot({ path: file, fullPage: true, animations: "disabled" });
              shot += 1;
              process.stdout.write(`ok  ${path.basename(file)}\n`);
            } catch (error) {
              failures.push({ name, url, error: String(error).slice(0, 200) });
              process.stdout.write(`ERR ${name} ${locale} ${theme} ${viewport}: ${error}\n`);
            } finally {
              if (state === "offline") await context.setOffline(false);
            }
          }
          await writeFile(
            path.join(OUT_DIR, `_console${suffix}__${as}__${locale}__${theme}__${viewport}.json`),
            JSON.stringify([...new Set(consoleErrors)], null, 2),
          );
          await context.close();
        }
      }
    }
  }

  await browser.close();
  await writeFile(
    path.join(OUT_DIR, `_overflow${suffix}.json`),
    JSON.stringify(overflows, null, 2),
  );
  console.log(`\n${shot} shots -> ${OUT_DIR}`);
  console.log(`${overflows.length} horizontal-overflow hits -> _overflow.json`);
  if (failures.length) console.log(`failures:\n${JSON.stringify(failures, null, 2)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
