import { spawn } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "lighthouse");
const TMP_DIR = path.join(OUT_DIR, ".tmp-mobile");
const BASELINE_PATH = path.join(OUT_DIR, "baseline-mobile.json");
const CHROME_PROFILE = path.join(ROOT, ".tmp-lighthouse-chrome");

const URLS = ["/ar-PS", "/en", "/ar-PS/login", "/ar-PS/register"].map(
  (route) => `http://localhost:3000${route}`,
);

const THRESHOLDS = {
  lcpMs: 2500,
  tbtMs: 200,
  cls: 0.1,
  accessibility: 0.95,
};

async function main() {
  await mkdir(TMP_DIR, { recursive: true });

  let server;
  if (!(await isUp("http://localhost:3000/ar-PS"))) {
    if (!(await hasProductionBuild())) {
      const buildCode = await run(process.platform === "win32" ? "pnpm.CMD" : "pnpm", ["build"]);
      if (buildCode !== 0) {
        throw new Error(`Unable to create Next.js production build; exit code ${buildCode}.`);
      }
    }

    server = spawn(process.platform === "win32" ? "pnpm.CMD" : "pnpm", ["start"], {
      cwd: ROOT,
      env: {
        ...process.env,
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1",
      },
      shell: process.platform === "win32",
      stdio: "inherit",
    });
    await waitForServer("http://localhost:3000/ar-PS");
  }

  try {
    const results = [];
    for (const url of URLS) {
      results.push(await runLighthouse(url));
    }

    const baseline = {
      generatedAt: new Date().toISOString(),
      formFactor: "mobile",
      thresholds: THRESHOLDS,
      results,
    };
    await writeFile(BASELINE_PATH, `${JSON.stringify(baseline, null, 2)}\n`);

    const failures = [];
    for (const result of results) {
      if (result.metrics.lcpMs > THRESHOLDS.lcpMs) {
        failures.push(`${result.url} LCP ${result.metrics.lcpMs}ms > ${THRESHOLDS.lcpMs}ms`);
      }
      if (result.metrics.tbtMs > THRESHOLDS.tbtMs) {
        failures.push(`${result.url} TBT ${result.metrics.tbtMs}ms > ${THRESHOLDS.tbtMs}ms`);
      }
      if (result.metrics.cls > THRESHOLDS.cls) {
        failures.push(`${result.url} CLS ${result.metrics.cls} > ${THRESHOLDS.cls}`);
      }
      if (result.categories.accessibility < THRESHOLDS.accessibility) {
        failures.push(
          `${result.url} a11y ${result.categories.accessibility} < ${THRESHOLDS.accessibility}`,
        );
      }
    }

    for (const result of results) {
      const m = result.metrics;
      console.log(
        `[mobile-lighthouse] ${result.url} LCP=${m.lcpMs}ms TBT=${m.tbtMs}ms CLS=${m.cls} a11y=${result.categories.accessibility}`,
      );
    }

    if (failures.length > 0) {
      throw new Error(`Mobile Lighthouse budget failed:\n${failures.join("\n")}`);
    }
  } finally {
    if (server && !server.killed) {
      server.kill();
    }
    await rm(TMP_DIR, { force: true, recursive: true }).catch(() => {});
    await rm(CHROME_PROFILE, { force: true, recursive: true }).catch(() => {});
  }
}

async function runLighthouse(url) {
  const slug = new URL(url).pathname.replaceAll("/", "_").replace(/^_/, "") || "root";
  const outputPath = path.join(TMP_DIR, `${slug}.json`);
  await rm(CHROME_PROFILE, { force: true, recursive: true }).catch(() => {});

  const args = [
    "--yes",
    "lighthouse@12.1.0",
    url,
    "--output=json",
    `--output-path=${outputPath}`,
    "--form-factor=mobile",
    "--throttling-method=provided",
    "--screenEmulation.mobile=true",
    "--screenEmulation.width=390",
    "--screenEmulation.height=844",
    "--screenEmulation.deviceScaleFactor=3",
    "--screenEmulation.disabled=false",
    "--emulated-user-agent=Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    `--chrome-flags=--headless=new --no-sandbox --disable-gpu --user-data-dir=${CHROME_PROFILE}`,
  ];

  const code = await run(process.platform === "win32" ? "npx.CMD" : "npx", args);
  const raw = await readFile(outputPath, "utf8").catch(() => null);
  if (!raw) {
    throw new Error(`Lighthouse failed for ${url} with exit code ${code}; no JSON was written.`);
  }

  const report = JSON.parse(raw);
  return {
    url,
    finalUrl: report.finalDisplayedUrl ?? report.finalUrl,
    fetchTime: report.fetchTime,
    categories: {
      performance: roundScore(report.categories.performance.score),
      accessibility: roundScore(report.categories.accessibility.score),
      bestPractices: roundScore(report.categories["best-practices"].score),
      seo: roundScore(report.categories.seo.score),
    },
    metrics: {
      lcpMs: roundMetric(report.audits["largest-contentful-paint"].numericValue),
      tbtMs: roundMetric(report.audits["total-blocking-time"].numericValue),
      cls: roundMetric(report.audits["cumulative-layout-shift"].numericValue, 4),
    },
  };
}

function run(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: ROOT,
      shell: process.platform === "win32",
      stdio: "inherit",
    });
    child.on("exit", (code) => resolve(code ?? 1));
  });
}

async function isUp(url) {
  try {
    const res = await fetch(url);
    return res.ok;
  } catch {
    return false;
  }
}

async function waitForServer(url) {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (await isUp(url)) return;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function hasProductionBuild() {
  const buildId = await readFile(path.join(ROOT, ".next", "BUILD_ID"), "utf8").catch(() => null);
  return Boolean(buildId?.trim());
}

function roundScore(value) {
  return Math.round(Number(value ?? 0) * 100) / 100;
}

function roundMetric(value, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(Number(value ?? 0) * factor) / factor;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
