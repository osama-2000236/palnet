// Mobile vision-QA screenshot harvester — the native twin of
// apps/web/e2e/shots.mjs. Walks every Expo Router screen via `baydar://` deep
// links and captures each one with `adb exec-out screencap`.
//
//   node apps/mobile/e2e/shots.mjs [--only=feed,saved] [--locale=ar-PS,en] [--theme=light,dark]
//
// Prerequisites (see .maestro/README.md):
//   1. an Android emulator running with the dev client installed
//   2. Metro:  pnpm --filter @baydar/mobile start
//   3. the API on :4000 and `adb reverse` for both ports — this script sets the
//      reverses itself, since without them the device cannot reach either.
//
// Why adb and not Maestro for the capture: navigating is one intent and
// capturing is one shell command. Maestro is worth it for the appearance
// switch (tap by testID) and nothing else here.
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const API = "http://localhost:4000/api/v1";
const APP_ID = "ps.baydar.app";
const OUT_DIR = process.env.QA_SHOTS_OUT ?? path.resolve(import.meta.dirname, "../.qa-shots");
const ADB =
  process.env.ADB ??
  path.join(
    process.env.LOCALAPPDATA ?? path.join(process.env.HOME ?? "", "AppData", "Local"),
    "Android",
    "Sdk",
    "platform-tools",
    "adb.exe",
  );

const arg = (name, fallback) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split("=").slice(1).join("=") : fallback;
};

const adb = (args, opts = {}) =>
  execFileSync(ADB, args, { encoding: "buffer", maxBuffer: 64 * 1024 * 1024, ...opts });

async function login(email, password) {
  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, deviceId: "qa-mobile-shots" }),
  });
  if (!res.ok) throw new Error(`login ${email}: ${res.status}`);
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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Raw framebuffer: a 16-byte header (width, height, format, colorspace as
 * uint32 LE) then width*height*4 bytes of RGBA.
 *
 * Raw rather than `screencap -p`, because a PNG is opaque — you cannot crop it
 * or count colours in it without a decoder, and both checks below need to.
 */
function grabFrame() {
  const buf = adb(["exec-out", "screencap"]);
  return { width: buf.readUInt32LE(0), height: buf.readUInt32LE(4), pixels: buf.subarray(16) };
}

/**
 * The rows between the status bar and the gesture pill.
 *
 * Comparing whole frames does not work: the clock and status icons tick on
 * their own, so a screen that has completely settled still reads as moving.
 * Measured on a blank splash — whole-frame said "changed", this slice said
 * "stable". Fractions rather than pixel counts, so it holds on any device.
 */
function contentSlice({ width, height, pixels }) {
  const top = Math.round(height * 0.06);
  const bottom = Math.round(height * 0.96);
  return pixels.subarray(top * width * 4, bottom * width * 4);
}

/**
 * Distinct colours in a sparse stride across the content area.
 *
 * Replaces a "PNG larger than 60KB" heuristic that was really a function of
 * screen resolution: on a smaller AVD a perfectly good render falls under the
 * threshold and the cell gets skipped. Colour count is resolution independent,
 * and the margin is not subtle — a blank splash scores 1, the launcher 902.
 */
function paintedness(frame) {
  const slice = contentSlice(frame);
  const seen = new Set();
  // Prime stride, so samples never align with a repeating pixel pattern.
  for (let i = 0; i + 3 < slice.length; i += 4 * 997) seen.add(slice.readUInt32LE(i));
  return seen.size;
}

// Tuned on one AVD (Pixel_7_Pro, swiftshader). The margin is not subtle — a
// blank splash scores 1 and the launcher 902 — so anything in 3..100 separates
// them, and the constant is only load-bearing on a device nobody has tried.
// Overridable, and `warmUp` reports the number it actually saw when it gives
// up, so a device where 8 is wrong says so instead of skipping a cell in
// silence. That is the property that matters: the previous constant here (a
// 60KB PNG size threshold) was wrong on smaller AVDs and failed invisibly.
const PAINTED_MIN = Number(process.env.QA_PAINTED_MIN ?? 8);

/**
 * Wait until the app is actually painting before shooting a cell. Changing
 * theme or locale restarts it (RTL applies at startup), and captureStable
 * cannot detect that on its own — a blank screen is perfectly stable.
 */
async function warmUp(timeoutMs = 90_000) {
  const started = Date.now();
  // Launch once, then poll. The previous version re-issued `am start` every 4s,
  // up to 22 times, restarting the very app it was waiting for.
  adb(["shell", "am", "start", "-a", "android.intent.action.VIEW", "-d", "baydar://feed", APP_ID]);
  let best = 0;
  while (Date.now() - started < timeoutMs) {
    await sleep(1000);
    const painted = paintedness(grabFrame());
    best = Math.max(best, painted);
    if (painted > PAINTED_MIN) return true;
  }
  process.stdout.write(
    `    warmUp gave up: best paintedness ${best} vs PAINTED_MIN ${PAINTED_MIN}` +
      ` — if the screen looked fine, raise or lower QA_PAINTED_MIN\n`,
  );
  return false;
}

// ── Device console capture ─────────────────────────────────────────────────
// The web harness writes `_console__*.json` per cell, and that capture is how
// the two missing `messaging.*` keys were found — a raw key path renders
// silently, but `IntlError` lands in the console. Mobile had no equivalent at
// all, so the same class of bug was invisible on the platform where Arabic is
// the default. React Native's console.warn/error surface in logcat under the
// `ReactNativeJS` tag; `AndroidRuntime:E` catches a native crash on top.
function logcatClear() {
  try {
    adb(["logcat", "-c"]);
  } catch {
    // A busy device occasionally refuses the clear; a stale line is noise, not
    // a reason to abandon the run.
  }
}

function logcatDump() {
  try {
    const raw = adb(["logcat", "-d", "-s", "ReactNativeJS:W", "AndroidRuntime:E", "*:S"]).toString(
      "utf8",
    );
    return raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("---------"))
      .map((line) => line.slice(0, 300));
  } catch {
    return [];
  }
}

/**
 * Capture once the screen stops changing.
 *
 * The device has no `networkidle`, and a fixed delay guesses wrong in both
 * directions — 2.6s caught the employer job form mid-spinner and shot a
 * "جارِ التحميل…" pill, while most screens settle far sooner. This is the
 * on-device equivalent of the web harness waiting for `.animate-pulse`.
 *
 * Settles on the raw content slice, then returns a real PNG encode.
 */
async function captureStable(minMs, maxMs) {
  const started = Date.now();
  await sleep(minMs);
  let previous = contentSlice(grabFrame());
  while (Date.now() - started < maxMs) {
    await sleep(700);
    const next = contentSlice(grabFrame());
    if (next.equals(previous)) break;
    previous = next;
  }
  return adb(["exec-out", "screencap", "-p"]);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  // The device reaches Metro and the API through these; without them every
  // screen renders an offline state and the whole run is worthless.
  adb(["reverse", "tcp:8081", "tcp:8081"]);
  adb(["reverse", "tcp:4000", "tcp:4000"]);

  const session = await login("demo@baydar.ps", "Password123");
  const jobId = first(await api(session, "/jobs?limit=5"))?.id;
  const handle = (await api(session, "/profiles/me"))?.handle ?? "demo";
  const roomId = first(await api(session, "/messaging/rooms?limit=5"))?.id;

  const owner = await login("owner@baydar.ps", "Password123").catch(() => null);
  const ownerCompany = owner ? first(await api(owner, "/companies/me")) : null;
  const employerSlug = ownerCompany?.slug ?? (owner ? "baydar" : null);
  // Same company the employer screens use. This was a full-text search for "ش"
  // with a hardcoded fallback — the search matches nothing once fixture debris
  // is swept, so it silently shot the fallback every time. Seeded membership is
  // the one thing guaranteed to resolve. Mirrors apps/web/e2e/shots.mjs.
  const companySlug = employerSlug ?? "baydar";
  // The jobs route keys on company id, not slug — passing the slug 403s with
  // "Not a member of this company", which reads like a permissions problem.
  const employerJobId = ownerCompany?.id
    ? first(await api(owner, `/companies/${ownerCompany.id}/jobs?limit=5`))?.id
    : null;

  // Expo Router drops `(group)` segments from the URL, so these mirror the file
  // tree under apps/mobile/app with the groups stripped.
  const screens = [
    ["root", ""],
    ["feed", "feed"],
    ["search", "search"],
    ["network", "network"],
    ["notifications", "notifications"],
    ["activity", "activity"],
    ["saved", "saved"],
    ["composer", "composer"],
    ["onboarding", "onboarding"],
    ["jobs", "jobs"],
    jobId && ["job-detail", `jobs/${jobId}`],
    ["messages", "messages"],
    ["messages-new", "messages/new"],
    roomId && ["message-thread", `messages/${roomId}`],
    ["me", "me"],
    ["me-edit", "me/edit"],
    ["me-connections", "me/connections"],
    ["me-karama", "me/karama"],
    ["me-premium", "me/premium"],
    ["profile-public", `in/${handle}`],
    ["company", `company/${companySlug}`],
    ["employer", "employer"],
    employerSlug && ["employer-detail", `employer/${employerSlug}`],
    employerSlug && ["employer-billing", `employer/${employerSlug}/billing`],
    employerSlug && ["employer-job-new", `employer/${employerSlug}/jobs/new`],
    employerSlug && employerJobId && ["employer-job", `employer/${employerSlug}/${employerJobId}`],
    ["settings", "settings"],
    ["settings-account", "settings/account"],
    ["settings-appearance", "settings/appearance"],
    ["settings-blocked", "settings/blocked"],
    ["settings-notifications", "settings/notifications"],
    ["settings-privacy", "settings/privacy"],
    ["settings-security", "settings/security"],
    // Auth screens render over the signed-in session; they are still the real
    // components, which is what a vision pass needs to look at.
    ["login", "login"],
    ["register", "register"],
    ["forgot-password", "forgot-password"],
    ["reset-password", "reset-password/invalid-token-for-qa"],
    ["verify-email", "verify-email/invalid-token-for-qa"],
  ].filter(Boolean);

  const only = arg("only", null)?.split(",");
  const picked = only ? screens.filter(([name]) => only.includes(name)) : screens;
  const locales = arg("locale", "ar-PS,en").split(",");
  const themes = arg("theme", "light,dark").split(",");
  const settle = Number(arg("settle", "1200"));
  const maxSettle = Number(arg("max-settle", "20000"));

  let shot = 0;
  const failures = [];

  for (const locale of locales) {
    for (const theme of themes) {
      process.stdout.write(`\n── ${locale} / ${theme} ──\n`);
      try {
        execFileSync(
          "maestro",
          [
            "test",
            path.resolve(import.meta.dirname, "../.maestro/set-appearance.yaml"),
            "-e",
            `THEME=${theme}`,
            "-e",
            `LOCALE=${locale}`,
          ],
          // shell:true because maestro ships as a .cmd shim on Windows, which
          // execFileSync cannot spawn directly.
          { stdio: "inherit", shell: true },
        );
      } catch {
        failures.push({ cell: `${locale}/${theme}`, error: "set-appearance flow failed" });
        process.stdout.write(`ERR could not set ${locale}/${theme} — cell skipped\n`);
        continue;
      }

      // Changing theme or locale restarts the app (RTL is applied at startup),
      // and captureStable cannot see that: a blank white screen is perfectly
      // stable, so the first screens of a cell were shot mid-restart and came
      // back empty. Warm up until something real is on screen, and fail the
      // cell loudly rather than filling it with blanks.
      if (!(await warmUp())) {
        failures.push({ cell: `${locale}/${theme}`, error: "app never rendered after restart" });
        process.stdout.write(`ERR ${locale}/${theme} never rendered — cell skipped\n`);
        continue;
      }

      const consoleByScreen = {};
      for (const [name, route] of picked) {
        const file = path.join(OUT_DIR, `${name}__${locale}__${theme}.png`);
        try {
          // Clear immediately before the navigation so whatever lands in the
          // buffer belongs to this screen and not the previous one.
          logcatClear();
          adb([
            "shell",
            "am",
            "start",
            "-a",
            "android.intent.action.VIEW",
            "-d",
            `baydar://${route}`,
            APP_ID,
          ]);
          await writeFile(file, await captureStable(settle, maxSettle));
          const lines = logcatDump();
          if (lines.length) consoleByScreen[name] = lines;
          shot += 1;
          process.stdout.write(`ok  ${path.basename(file)}${lines.length ? ` (${lines.length} log)` : ""}\n`);
        } catch (error) {
          failures.push({ name, route, error: String(error).slice(0, 160) });
          process.stdout.write(`ERR ${name} ${locale} ${theme}\n`);
        }
      }
      await writeFile(
        path.join(OUT_DIR, `_console__${locale}__${theme}.json`),
        JSON.stringify(consoleByScreen, null, 2),
      );
      const missingKeys = Object.entries(consoleByScreen).flatMap(([screen, lines]) =>
        lines.filter((l) => /MISSING_MESSAGE|IntlError|i18next::/.test(l)).map((l) => `${screen}: ${l}`),
      );
      if (missingKeys.length) {
        process.stdout.write(`\n!! ${missingKeys.length} i18n errors in ${locale}/${theme}:\n`);
        for (const line of missingKeys.slice(0, 10)) process.stdout.write(`   ${line}\n`);
      }
    }
  }

  process.stdout.write(`\n${shot} shots -> ${OUT_DIR}\n`);
  if (failures.length) process.stdout.write(`failures:\n${JSON.stringify(failures, null, 2)}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
