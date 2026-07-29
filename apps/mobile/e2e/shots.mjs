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
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const sha1 = (buf) => createHash("sha1").update(buf).digest("hex").slice(0, 12);

// The device always asks for :8081 and :4000 — those are baked into the dev
// client and the app's API base. `adb reverse` is what decides which host
// process answers, so a second worktree can run its own Metro/API on other
// ports and still be the one under test. Without this the harness silently
// photographs whichever worktree happens to own the default ports.
const METRO_PORT = process.env.QA_METRO_PORT ?? "8081";
const API_PORT = process.env.QA_API_PORT ?? "4000";
const API = `http://localhost:${API_PORT}/api/v1`;
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

export const adb = (args, opts = {}) =>
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
export function grabFrame() {
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
export function paintedness(frame) {
  const slice = contentSlice(frame);
  const seen = new Set();
  // Prime stride, so samples never align with a repeating pixel pattern.
  for (let i = 0; i + 3 < slice.length; i += 4 * 997) seen.add(slice.readUInt32LE(i));
  return seen.size;
}

/**
 * Mean luminance (0–255) of the content area.
 *
 * This exists because a whole 38-shot cell was once captured in the light theme
 * and filed under `__dark`. The appearance flow reported every step COMPLETED —
 * `setChoice` writes the preference to SecureStore without awaiting it, and
 * Maestro's `launchApp` force-stops the app moments later, so the write loses
 * the race and the app boots back into light. Nothing downstream could tell:
 * a light screenshot named `…__dark.png` is a perfectly valid PNG.
 *
 * Luminance separates the two themes with a margin nothing else in the frame
 * comes close to (light ≈ 240, dark ≈ 45), so it is a cheap, device-independent
 * assertion that the cell is the theme it claims to be.
 */
function meanLuminance(frame) {
  const slice = contentSlice(frame);
  let total = 0;
  let n = 0;
  for (let i = 0; i + 3 < slice.length; i += 4 * 997) {
    total += 0.2126 * slice[i] + 0.7152 * slice[i + 1] + 0.0722 * slice[i + 2];
    n += 1;
  }
  return n ? total / n : 0;
}

// Midpoint between the two observed clusters. A cell landing on the wrong side
// is the mislabel above, not a design change.
const THEME_LUMA_SPLIT = Number(process.env.QA_THEME_LUMA_SPLIT ?? 140);

// Tuned on one AVD (Pixel_7_Pro, swiftshader). The margin is not subtle — a
// blank splash scores 1 and the launcher 902 — so anything in 3..100 separates
// them, and the constant is only load-bearing on a device nobody has tried.
// Overridable, and `warmUp` reports the number it actually saw when it gives
// up, so a device where 8 is wrong says so instead of skipping a cell in
// silence. That is the property that matters: the previous constant here (a
// 60KB PNG size threshold) was wrong on smaller AVDs and failed invisibly.
const PAINTED_MIN = Number(process.env.QA_PAINTED_MIN ?? 8);

/**
 * Wait until something is on screen before shooting a cell. Changing theme or
 * locale restarts the app (RTL applies at startup), and captureStable cannot
 * detect that on its own — a blank screen is perfectly stable.
 *
 * NOT a health check, and it must not be read as one. Measured against the
 * dev-server redbox: the error screen scores **122** distinct colours and a
 * real feed screen **115**, so a crash screen is *more* painted than the app
 * working. All this proves is "not blank". The distinct-screen report at the
 * end of each cell is what catches a run that photographed one error screen
 * N times.
 */
export async function warmUp(timeoutMs = 90_000) {
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

// ponytail: logcat only. On this stack (RN 0.81 + Hermes, Expo dev client) JS
// `console.*` is forwarded to the Metro terminal and never reaches logcat, so
// `ReactNativeJS` is absent from the buffer entirely and this capture returns
// nothing on every screen. Verified 2026-07-26: `adb logcat -d -v tag` over a
// full 38-screen run lists no ReactNativeJS lines at all, and the 38 `{}` files
// it produced read as "no warnings" rather than "not looking". `AndroidRuntime:E`
// is still worth keeping — a native crash does land there. The upgrade path is
// to read Metro's own stdout (where `[observability]`/`IntlError` lines do
// appear) instead of logcat; that needs the harness to own the Metro process,
// which it currently does not. Until then `assertConsoleCaptureWorks` makes the
// silence loud instead of invisible.
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
  // The settled content slice doubles as the screen's fingerprint. Hashing the
  // PNG instead would be useless: the status-bar clock ticks between captures,
  // so every screen would look unique. `contentSlice` already drops the top 6%.
  return { png: adb(["exec-out", "screencap", "-p"]), id: sha1(previous) };
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  // The device reaches Metro and the API through these; without them every
  // screen renders an offline state and the whole run is worthless.
  adb(["reverse", "tcp:8081", `tcp:${METRO_PORT}`]);
  adb(["reverse", "tcp:4000", `tcp:${API_PORT}`]);
  if (METRO_PORT !== "8081" || API_PORT !== "4000") {
    process.stdout.write(
      `device :8081 -> host :${METRO_PORT}, device :4000 -> host :${API_PORT}\n`,
    );
  }

  // ONE account resolves every id, and it must be the account the device is
  // signed in as — `set-appearance.yaml` deliberately does not `clearState`,
  // so whoever logged in last owns the run.
  //
  // This used to resolve most ids from `demo` and the employer ids from
  // `owner`. Two accounts, one device: `demo` has no companies at all
  // (`GET /companies/me` -> []) and gets 403 on owner's, so the three employer
  // screens could only ever photograph an error state. They were filed as
  // "unreviewed" for a whole round because a 403 page is a perfectly valid
  // PNG — the same silent-wrong-answer this harness keeps producing.
  const ACCOUNT = process.env.QA_ACCOUNT ?? "demo@baydar.ps";
  const session = await login(ACCOUNT, "Password123");
  const jobId = first(await api(session, "/jobs?limit=5"))?.id;
  const handle = (await api(session, "/profiles/me"))?.handle ?? "demo";
  const roomId = first(await api(session, "/messaging/rooms?limit=5"))?.id;

  // Employer screens exist only for an account with a company. Skipping them
  // loudly beats shooting three 403s: run with
  // `QA_ACCOUNT=owner@baydar.ps` to review them.
  const myCompany = first(await api(session, "/companies/me"));
  const employerSlug = myCompany?.slug ?? null;
  const companySlug = employerSlug ?? "baydar";
  if (!employerSlug) {
    process.stdout.write(
      `note: ${ACCOUNT} belongs to no company — skipping the 3 employer screens.
` +
        `      re-run with QA_ACCOUNT=owner@baydar.ps to capture them.
`,
    );
  }
  // The jobs route keys on company id, not slug — passing the slug 403s with
  // "Not a member of this company", which reads like a permissions problem.
  const employerJobId = myCompany?.id
    ? first(await api(session, `/companies/${myCompany.id}/jobs?limit=5`))?.id
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
    ["employer-new", "employer/new"],
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
          ["test", ".maestro/set-appearance.yaml", "-e", `THEME=${theme}`, "-e", `LOCALE=${locale}`],
          // shell:true because maestro ships as a .cmd shim on Windows, which
          // execFileSync cannot spawn directly. That makes the flow path a
          // shell argument, and node picks the shell from the environment: under
          // a POSIX shell every backslash in a Windows absolute path is eaten,
          // and maestro reports "Flow path does not exist:
          // C:\...\LinkedIn.claudeworktrees…". A relative path with no
          // backslashes survives either shell — hence `cwd` rather than
          // `path.resolve`.
          { cwd: path.resolve(import.meta.dirname, ".."), stdio: "inherit", shell: true },
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

      // Prove the cell is the theme it is about to be labelled with, before
      // spending ~15 minutes photographing it. See meanLuminance.
      const luma = meanLuminance(grabFrame());
      const looksDark = luma < THEME_LUMA_SPLIT;
      if (looksDark !== (theme === "dark")) {
        failures.push({
          cell: `${locale}/${theme}`,
          error: `theme did not apply — mean luminance ${Math.round(luma)} reads ${looksDark ? "dark" : "light"}`,
        });
        process.stdout.write(
          `ERR ${locale}/${theme} did not apply (luminance ${Math.round(luma)}) — cell skipped\n` +
            `    the appearance preference lost its race with the relaunch; re-run this cell\n`,
        );
        continue;
      }
      process.stdout.write(`    theme verified (luminance ${Math.round(luma)})\n`);

      const consoleByScreen = {};
      let shotsThisCell = 0;
      /** content-slice fingerprint -> screens that rendered it, this cell. */
      const identical = new Map();
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
          const { png, id } = await captureStable(settle, maxSettle);
          await writeFile(file, png);
          identical.set(id, [...(identical.get(id) ?? []), name]);
          const lines = logcatDump();
          if (lines.length) consoleByScreen[name] = lines;
          shot += 1;
          shotsThisCell += 1;
          process.stdout.write(
            `ok  ${path.basename(file)}${lines.length ? ` (${lines.length} log)` : ""}\n`,
          );
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
        lines
          .filter((l) => /MISSING_MESSAGE|IntlError|i18next::/.test(l))
          .map((l) => `${screen}: ${l}`),
      );
      if (missingKeys.length) {
        process.stdout.write(`\n!! ${missingKeys.length} i18n errors in ${locale}/${theme}:\n`);
        for (const line of missingKeys.slice(0, 10)) process.stdout.write(`   ${line}\n`);
      }
      if (Object.keys(consoleByScreen).length === 0) {
        // An empty capture across a whole cell means the buffer was not read,
        // not that 38 screens were clean. Say so — the web twin's equivalent
        // capture is what found two missing message keys.
        process.stdout.write(
          `\n!! ${locale}/${theme}: console capture is EMPTY for all ${picked.length} screens.\n` +
            `   JS logs go to the Metro terminal on this stack, not logcat — treat this\n` +
            `   file as "not looked", never as "no warnings". See the note on logcatDump.\n`,
        );
      }

      // A file per route is not a screen per route. Measured on the existing
      // corpus: `onboarding` and `root` are byte-identical to `feed` in the
      // content region, so two of the 38 "reviewed" screens were the feed
      // photographed again — and the harness reported 38 ok lines.
      //
      // Reports the numbers and names the groups. Deliberately draws no
      // conclusion: the first version guessed "almost certainly one error
      // screen" whenever a group exceeded half the cell, and the very first run
      // tripped it on `root`/`feed`/`onboarding` — three routes that legitimately
      // land on the feed. A confident wrong verdict is worse than none, and it
      // is the same defect as the checks this report exists to catch. A redirect
      // and a redbox are indistinguishable from pixels alone; a reviewer reading
      // "38 files, 1 distinct screen" needs no help from a heuristic.
      if (identical.size < shotsThisCell) {
        process.stdout.write(
          `\n!! ${locale}/${theme}: ${shotsThisCell} files, ${identical.size} distinct screens —\n` +
            `   a file per route is not a screen per route. Check each group below is a\n` +
            `   redirect you expect and not a route that failed to navigate.\n`,
        );
        for (const [, names] of identical) {
          if (names.length > 1) process.stdout.write(`   identical: ${names.join(", ")}\n`);
        }
      }
    }
  }

  process.stdout.write(`\n${shot} shots -> ${OUT_DIR}\n`);
  if (failures.length) process.stdout.write(`failures:\n${JSON.stringify(failures, null, 2)}\n`);
}

// Importable, so `device-up.mjs` can reuse `adb` and `warmUp` instead of
// keeping a second copy of the framebuffer logic. Only run the matrix when this
// file is the process entry point.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
