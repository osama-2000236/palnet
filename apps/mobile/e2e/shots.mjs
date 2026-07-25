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
const adbText = (args) => adb(args, { encoding: "utf8" }).toString().trim();

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
  return res.ok ? (await res.json()).data : null;
}

const first = (v) => (Array.isArray(v) ? v[0] : (v?.items?.[0] ?? v?.data?.[0] ?? null));

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  // The device reaches Metro and the API through these; without them every
  // screen renders an offline state and the whole run is worthless.
  adb(["reverse", "tcp:8081", "tcp:8081"]);
  adb(["reverse", "tcp:4000", "tcp:4000"]);

  const session = await login("demo@baydar.ps", "Password123");
  const jobId = first(await api(session, "/jobs?limit=5"))?.id;
  const handle = (await api(session, "/profiles/me"))?.handle ?? "demo";
  const companySlug =
    first(await api(session, "/search/companies?q=%D8%B4&limit=5"))?.slug ?? "baydar";
  const roomId = first(await api(session, "/messaging/rooms?limit=5"))?.id;

  const owner = await login("owner@baydar.ps", "Password123").catch(() => null);
  const employerSlug = owner ? (first(await api(owner, "/companies/me"))?.slug ?? "baydar") : null;
  const employerJobId =
    owner && employerSlug
      ? first(await api(owner, `/companies/${employerSlug}/jobs?limit=5`))?.id
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
  const settle = Number(arg("settle", "2600"));

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

      for (const [name, route] of picked) {
        const file = path.join(OUT_DIR, `${name}__${locale}__${theme}.png`);
        try {
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
          // No networkidle equivalent on device: React Query resolves after the
          // navigation settles, so wait a fixed beat before shooting.
          await new Promise((r) => setTimeout(r, settle));
          await writeFile(file, adb(["exec-out", "screencap", "-p"]));
          shot += 1;
          process.stdout.write(`ok  ${path.basename(file)}\n`);
        } catch (error) {
          failures.push({ name, route, error: String(error).slice(0, 160) });
          process.stdout.write(`ERR ${name} ${locale} ${theme}\n`);
        }
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
