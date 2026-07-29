// Bring a running Android emulator to a state where `e2e/shots.mjs` works.
//
//   node apps/mobile/e2e/device-up.mjs [--skip-bundle] [--metro-port=8083]
//
// Stays in the foreground: it owns Metro, the API and the bundle proxy, and
// Ctrl-C takes all three down. Run the matrix from a second terminal:
//
//   pnpm --filter @baydar/mobile e2e:shots
//
// This exists because getting one screenshot took ~90 minutes of rediscovering
// three unrelated blockers, each of which *looks* like a bug in your change and
// is not. Every workaround below is load-bearing; the comment above each one
// says what breaks without it. Longer write-up: `.maestro/README.md`.
import { execFileSync, spawn } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import http from "node:http";
import net from "node:net";
import path from "node:path";

import { adb, warmUp } from "./shots.mjs";

const MOBILE = path.resolve(import.meta.dirname, "..");
const REPO = path.resolve(MOBILE, "../..");
const APP_ID = "ps.baydar.app";

const arg = (name, fallback) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split("=").slice(1).join("=") : fallback;
};
const flag = (name) => process.argv.includes(`--${name}`);

// 8081 is not a choice. The dev client persists `10.0.2.2:8081` from whatever
// URL it was first launched with and reuses it forever, and `10.0.2.2` reaches
// the host directly — `adb reverse` cannot redirect it. So the proxy owns 8081
// and Metro moves aside.
const PROXY_PORT = 8081;
const METRO_PORT = Number(arg("metro-port", "8083"));
const API_PORT = Number(arg("api-port", "4000"));
const API_ENV = arg("api-env", ".env.qa.local");
const BUNDLE_DIR = path.join(MOBILE, ".qa-bundle");
const BUNDLE = path.join(BUNDLE_DIR, "index.android.bundle");

const say = (line) => process.stdout.write(`${line}\n`);
function fail(lines) {
  process.stdout.write(`\n${lines.join("\n")}\n`);
  process.exit(1);
}

const listening = (port) =>
  new Promise((resolve) => {
    const socket = net.connect(port, "127.0.0.1");
    socket.on("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.on("error", () => resolve(false));
  });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const children = [];
function background(label, command, args, opts = {}) {
  const child = spawn(command, args, { stdio: "ignore", shell: true, ...opts });
  child.on("exit", (code) => say(`   ${label} exited (${code})`));
  children.push(child);
  return child;
}

async function waitForPort(port, label, timeoutMs) {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    if (await listening(port)) return true;
    await sleep(1000);
  }
  fail([`✖ ${label} never came up on :${port} within ${timeoutMs / 1000}s.`]);
}

// ── 1. a device ────────────────────────────────────────────────────────────
function assertDevice() {
  const lines = adb(["devices"])
    .toString("utf8")
    .split(/\r?\n/)
    .slice(1)
    .filter((l) => /\tdevice$/.test(l));
  if (lines.length === 0) {
    fail([
      "✖ no emulator attached.",
      "  Start one first — this AVD needs the software renderer:",
      "    emulator -avd Pixel_7_Pro -gpu swiftshader_indirect",
    ]);
  }
  say(`1/6 device      ${lines[0].split("\t")[0]}`);
}

// ── 2. the dev client must not predate the native dependencies ─────────────
/**
 * A dev client older than the RN it has to run red-boxes with
 *
 *   Compiling JS failed: <line>:<col>:')' expected at end of function call
 *
 * which reads *exactly* like a syntax error in your change. It is not: the
 * APK's Hermes is too old to compile a bundle Metro emits today. An hour went
 * into debugging perfectly good JS before that was understood, so refuse to
 * start instead of letting the next person repeat it.
 *
 * `pnpm-lock.yaml` is the marker because git only rewrites its mtime when the
 * content actually differs between commits — which is exactly when the native
 * side needs rebuilding. A checkout that does not change dependencies leaves it
 * alone.
 */
function assertFreshDevClient() {
  const dump = adb(["shell", "dumpsys", "package", APP_ID]).toString("utf8");
  const installed = /lastUpdateTime=(\d{4}-\d\d-\d\d \d\d:\d\d:\d\d)/.exec(dump)?.[1];
  if (!installed) {
    fail([`✖ ${APP_ID} is not installed on the device.`, "", ...rebuildInstructions()]);
  }

  // dumpsys prints device-local time and the emulator is rarely on the host's
  // timezone (UTC vs +03 here — a 3h skew, enough to call a fresh APK stale).
  // Comparing *ages* rather than instants cancels the offset out entirely.
  //
  // No space in the format string: `adb shell` joins its args with spaces and
  // the device shell re-splits them, so `+%Y-%m-%d %H:%M:%S` arrives as two
  // arguments and `date` prints the day alone. That parsed to midnight and made
  // every APK look 13 hours *younger* than the clock — a check that could not
  // fail. Hence the negative guard below.
  const deviceNow = adb(["shell", "date", "+%Y-%m-%dT%H:%M:%S"]).toString("utf8").trim();
  const apkAgeMs = Date.parse(deviceNow) - Date.parse(installed.replace(" ", "T"));
  const lockAgeMs = Date.now() - statSync(path.join(REPO, "pnpm-lock.yaml")).mtimeMs;
  const hours = (ms) => `${(ms / 3_600_000).toFixed(1)}h`;

  if (!Number.isFinite(apkAgeMs) || apkAgeMs < 0) {
    fail([
      `✖ cannot read the install age: device clock ${deviceNow}, installed ${installed}.`,
      "  Refusing to report freshness from a bad read.",
    ]);
  }
  if (apkAgeMs > lockAgeMs) {
    fail([
      "✖ the installed dev client predates the current native dependencies.",
      `    APK installed   ${hours(apkAgeMs)} ago`,
      `    pnpm-lock.yaml  ${hours(lockAgeMs)} ago`,
      "",
      "  Running it anyway red-boxes with \"Compiling JS failed: <line>:<col>:')'",
      "  expected\", which reads like a syntax error in your change. It is the",
      "  APK's old Hermes failing on a current bundle.",
      "",
      ...rebuildInstructions(),
    ]);
  }
  say(`2/6 dev client  installed ${hours(apkAgeMs)} ago, lockfile ${hours(lockAgeMs)} ago — current`);
}

function rebuildInstructions() {
  return [
    "  Rebuild it (from a SHORT path — the pnpm store blows CMake's path limit",
    "  under the worktree base, and RelWithDebInfo cannot build here at all):",
    "",
    "    git worktree add --detach C:\\b HEAD",
    "    copy .npmrc + apps/mobile/.env into C:\\b   # .npmrc caps the store names",
    "    cd C:\\b && pnpm install",
    "    cd apps/mobile && npx expo run:android",
    "",
    "  ~3 minutes. See apps/mobile/.maestro/README.md.",
  ];
}

// ── 3. the API ─────────────────────────────────────────────────────────────
async function ensureApi() {
  adb(["reverse", `tcp:${API_PORT}`, `tcp:${API_PORT}`]);
  if (await listening(API_PORT)) {
    say(`3/6 api         already on :${API_PORT} (not started by this run)`);
    return;
  }
  if (!existsSync(path.join(REPO, API_ENV))) {
    fail([
      `✖ ${API_ENV} is missing at the repo root, so the API cannot start.`,
      "  It holds the local DB URL and the JWT secrets and is deliberately",
      "  gitignored — copy it from another worktree.",
    ]);
  }
  background("api", "node", ["scripts/run-api-local.mjs", API_ENV], { cwd: REPO });
  await waitForPort(API_PORT, "api", 90_000);
  say(`3/6 api         started on :${API_PORT}`);
}

// ── 4. the bundle, built to a file ─────────────────────────────────────────
/**
 * `expo export:embed` rather than letting the device pull from Metro, because
 * this emulator cannot receive what Metro sends (see the proxy below).
 *
 * `--entry-file` must be absolute: gradle's `resolveAppEntry` default emits
 * `./index.ts`, which resolves against the pnpm-monorepo Metro root and not
 * this package, and fails.
 */
function buildBundle() {
  if (flag("skip-bundle")) {
    if (!existsSync(BUNDLE)) fail([`✖ --skip-bundle passed but ${BUNDLE} does not exist.`]);
    const age = (Date.now() - statSync(BUNDLE).mtimeMs) / 60_000;
    say(`4/6 bundle      reused, built ${age.toFixed(0)}m ago (--skip-bundle)`);
    return;
  }
  if (!existsSync(path.join(MOBILE, ".env"))) {
    say("    note: apps/mobile/.env is missing — EXPO_PUBLIC_* defaults get baked in.");
  }
  say("4/6 bundle      expo export:embed --dev false (~40s) …");
  execFileSync(
    "npx",
    [
      "expo",
      "export:embed",
      "--platform",
      "android",
      "--dev",
      "false",
      "--entry-file",
      path.join(MOBILE, "index.ts"),
      "--bundle-output",
      BUNDLE,
      "--assets-dest",
      BUNDLE_DIR,
    ],
    { cwd: MOBILE, stdio: "inherit", shell: true },
  );
  const mb = (statSync(BUNDLE).size / 1024 / 1024).toFixed(1);
  say(`    ${mb}MB -> ${path.relative(REPO, BUNDLE)}`);
}

// ── 5. Metro, moved aside, behind a proxy that owns 8081 ───────────────────
/**
 * Two independent transport failures, one proxy.
 *
 * RN asks for `Accept: multipart/mixed` so it can draw a download progress bar.
 * Metro answers with a chunked multipart stream and this emulator's OkHttp dies
 * parsing it: `ProtocolException: Expected leading [0-9a-fA-F] character but was
 * 0xd` in `MultipartStreamReader.readAllParts`. Metro is innocent — `curl` pulls
 * the identical response cleanly on the host. Stripping multipart from the
 * Accept header takes `BundleDownloader` down its plain path instead.
 *
 * The plain path then dies too — `unexpected end of stream` — because a 17MB dev
 * bundle does not survive the emulator's NAT. So `.bundle` is answered from the
 * file built above (~5.7MB, minified) with a real `Content-Length`. Metro still
 * serves assets, `/symbolicate` and everything else.
 */
function startProxy() {
  const bundleBytes = readFileSync(BUNDLE);
  return new Promise((resolve) => {
    http
      .createServer((req, res) => {
        const url = req.url ?? "/";
        if (url.includes(".bundle")) {
          res.writeHead(200, {
            "content-type": "application/javascript; charset=UTF-8",
            "content-length": String(bundleBytes.length),
          });
          res.end(bundleBytes);
          say(`    proxy 200 (from disk) ${url.slice(0, 52)} -> ${bundleBytes.length}b`);
          return;
        }
        const headers = { ...req.headers, host: `127.0.0.1:${METRO_PORT}` };
        if (typeof headers.accept === "string" && headers.accept.includes("multipart/mixed")) {
          headers.accept = "application/javascript, */*";
        }
        delete headers["accept-encoding"]; // keep the body plain so buffering is honest
        const upstream = http.request(
          { host: "127.0.0.1", port: METRO_PORT, method: req.method, path: url, headers },
          (up) => {
            const chunks = [];
            up.on("data", (c) => chunks.push(c));
            up.on("end", () => {
              const body = Buffer.concat(chunks);
              const out = { ...up.headers };
              delete out["transfer-encoding"];
              out["content-length"] = String(body.length);
              res.writeHead(up.statusCode ?? 200, out);
              res.end(body);
            });
            up.on("error", () => res.destroy());
          },
        );
        upstream.on("error", (e) => res.writeHead(502).end(String(e.message)));
        req.pipe(upstream);
      })
      .on("connection", (socket) => socket.setTimeout(0)) // long transfers must not be reaped
      .listen(PROXY_PORT, "0.0.0.0", resolve);
  });
}

async function ensureMetro() {
  if (await listening(METRO_PORT)) {
    say(`5/6 metro       already on :${METRO_PORT}`);
  } else {
    background("metro", "npx", ["expo", "start", "--port", String(METRO_PORT)], { cwd: MOBILE });
    await waitForPort(METRO_PORT, "metro", 120_000);
    say(`5/6 metro       started on :${METRO_PORT}`);
  }
  if (await listening(PROXY_PORT)) {
    fail([
      `✖ :${PROXY_PORT} is already taken, and the dev client will only ever ask that port.`,
      "  Stop whatever owns it (an older proxy, or a Metro on the default port).",
    ]);
  }
  await startProxy();
  say(`    proxy on :${PROXY_PORT} -> metro :${METRO_PORT}, .bundle from disk`);
}

// ── 6. render something ────────────────────────────────────────────────────
async function assertRenders() {
  adb(["shell", "am", "force-stop", APP_ID]); // pick up the freshly built bundle
  if (!(await warmUp(120_000))) {
    fail([
      "✖ the app never rendered.",
      "  Look at the device, then at logcat:",
      `    adb logcat -d -s ReactNativeJS:W AndroidRuntime:E ReactNative:E`,
      "  A red box here is a real failure — the three usual impostors are ruled",
      "  out above.",
    ]);
  }
  say("6/6 app         rendering");
}

async function main() {
  assertDevice();
  assertFreshDevClient();
  await ensureApi();
  buildBundle();
  await ensureMetro();
  await assertRenders();

  say("");
  say("ready. In another terminal:");
  say("    pnpm --filter @baydar/mobile e2e:shots");
  say("");
  say("Ctrl-C here takes Metro, the API and the proxy down.");
  await new Promise(() => {}); // hold the proxy open
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    for (const child of children) child.kill();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error(error);
  for (const child of children) child.kill();
  process.exit(1);
});
