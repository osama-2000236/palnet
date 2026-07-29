#!/usr/bin/env node
// Cross-platform i18n gate.
//
// Each app already tests its own catalogs against each other and against the
// keys its code asks for (`messages-parity.test.ts`, `i18n-parity.test.ts`).
// Both suites stop at the platform boundary, and the two helper functions in
// them are byte-identical — which is how web and mobile came to say different
// things on the same screen without any gate noticing.
//
// What this adds:
//   1. Shared keys must carry the same string on both platforms, after
//      normalising the two interpolation dialects (next-intl `{x}` and ICU
//      `{x, number}` vs i18next `{{x}}`).
//   2. Divergences must be listed in DIVERGENCES below with a reason. The list
//      is a debt ledger, not a config: it may shrink, and a new entry is a
//      deliberate act.
//   3. A key defined but never referenced is dead weight. Namespaces built
//      from dynamic keys (`t(\`errors.${code}\`)`) are exempt by name.
//   4. A key that exists on one platform and not the other is surface one
//      platform has and the other does not. That was invisible: the gate
//      printed "931 web keys, 819 mobile keys" and drew no conclusion from the
//      112-key difference. It is now counted, attributed to a namespace, and
//      ratcheted — the numbers below may only go down.
//
// Exits non-zero on any hit. Prints a grep-friendly report.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

const WEB_CATALOG = "apps/web/messages/ar-PS.json";
const MOBILE_CATALOG = "apps/mobile/src/i18n/ar.json";

/**
 * Keys that legitimately differ, or that differ and have not been reconciled
 * yet. Every entry needs a reason. Shrinking this list is the point.
 */
const DIVERGENCES = new Map([
  // Genuinely different surfaces, not drift. The web landing page is a
  // marketing page that search traffic arrives on; the mobile one is the
  // pre-auth intro a user sees after they have already installed the app.
  ["landing.title", "different surfaces: web is acquisition, mobile is post-install"],
  ["landing.subtitle", "different surfaces: web is acquisition, mobile is post-install"],

  // Unreconciled copy drift. These say different things on the same screen and
  // need a native-speaker read, which `docs/HANDOFF.md` already records as
  // owed. Listed so no more can join them silently.
  ["auth.deletedGraceBanner", "unreconciled: web names the restore path, mobile does not"],
  ["onboarding.submit", "unreconciled: different calls to action"],
  ["composer.placeholder", "unreconciled: mobile prompt is longer"],
  ["composer.submit", "unreconciled: نشر vs انشر"],
  ["composer.addImage", "unreconciled: label vs action phrasing"],
  ["messaging.emptyThread", "unreconciled"],
  ["notifications.empty", "unreconciled"],
  ["notifications.templates.JOB_APPLICATION_UPDATE", "unreconciled"],
  ["activity.subtitle", "unreconciled"],
  ["activity.metrics.requests", "unreconciled"],
  ["activity.metrics.jobs", "unreconciled"],
  ["activity.tasks.empty", "unreconciled"],
  ["activity.tasks.profile.title", "unreconciled"],
  ["activity.tasks.network.title", "unreconciled"],
  ["activity.tasks.network.body", "unreconciled"],
  ["activity.tasks.notifications.title", "unreconciled"],
  ["activity.tasks.notifications.body", "unreconciled"],
  ["activity.tasks.security.body", "unreconciled"],
  ["activity.jobs.title", "unreconciled"],
  ["activity.jobs.empty", "unreconciled"],
  ["jobs.cityPlaceholder", "unreconciled"],
  ["jobs.emptyTitle", "unreconciled"],
  ["settings.items.appearanceDesc", "unreconciled"],
  ["settings.notifications.events.karamaUpdate.desc", "unreconciled"],
  ["account.export.success", "unreconciled"],
  ["employer.title", "unreconciled"],
  ["employer.subtitle", "unreconciled"],
  ["billing.checkout.cardRedirect", "unreconciled"],
]);

/**
 * Namespaces that exist on one platform because the *surface* does. Each needs
 * a reason, same as the drift ledgers: a namespace listed here is a decision, a
 * namespace missing from here is counted against the ceiling below.
 */
const PLATFORM_ONLY_NAMESPACES = {
  web: {
    admin: "mobile ships no admin surface — no moderation, no billing console",
    publicJob: "the public /j/[id] SEO route; mobile has no unauthenticated job page",
    chrome: "AppShell's persistent chrome. Mobile screens each own an AppHeader",
    cv: "the CV builder is web-only — no mobile screen references cv.*",
  },
  mobile: {
    api: "native map from API error codes to copy; web's equivalent is `errors`",
    appGate: "the native update/maintenance gate. A web tab just reloads",
    system: "native crash and offline chrome, outside any screen",
    onboarding:
      "mobile runs a six-step wizard against web's single form — a screen-parity " +
      "difference tracked in docs/audit, not a copy gap",
  },
  both: {
    landing: "web is acquisition, mobile is the post-install intro — see DIVERGENCES",
  },
};

/**
 * Keys present on one platform only, after the namespaces above are excused.
 *
 * A ratchet, not a target: the check fails when a number goes **up**, and also
 * when it goes down without this line being lowered, so closing a gap has to be
 * recorded. Both directions matter — 163 keys of web surface that mobile does
 * not have, and 101 the other way.
 */
const MAX_PLATFORM_ONLY_KEYS = { web: 163, mobile: 101 };

/**
 * Namespaces whose keys are reached through a template literal or a translator
 * passed as a parameter, so no static scan can see the reference.
 */
const DYNAMIC_NAMESPACES = {
  web: [
    // `toErrorMessage(e, t)` takes the translator as an argument.
    "errors",
    "admin.billing",
    "admin.moderation",
    "jobs",
    "employer",
    "billing",
    "karama",
    "premium",
    "messaging",
    "network",
    "notifications.templates",
    "auth",
    "saved",
    "search",
    "settings.notifications",
    "settings.privacy",
    "landing",
  ],
  mobile: [
    "api",
    "auth",
    "errors",
    "jobs",
    "employer",
    "billing",
    "karama",
    "premium",
    "notifications",
    "settings",
    "onboarding",
    "network",
    "messaging",
    "search",
    "saved",
    "activity",
    "company",
    "toast",
    "post",
    "profile",
    "common",
    "system",
    "appGate",
    "nav",
    "feed",
    "composer",
    "safety",
    "messages",
    "account",
  ],
};

const read = (rel) => JSON.parse(readFileSync(join(ROOT, rel), "utf8"));

function flatten(node, prefix = "") {
  if (node === null || typeof node !== "object") return [[prefix, node]];
  return Object.entries(node).flatMap(([key, value]) =>
    flatten(value, prefix ? `${prefix}.${key}` : key),
  );
}

function sourceFiles(dir) {
  return readdirSync(join(ROOT, dir)).flatMap((entry) => {
    const rel = `${dir}/${entry}`;
    if (statSync(join(ROOT, rel)).isDirectory()) {
      return entry === "__tests__" || entry === "node_modules" ? [] : sourceFiles(rel);
    }
    return /\.tsx?$/.test(entry) ? [rel] : [];
  });
}

/** i18next `{{x}}` and next-intl ICU `{x, number}` both reduce to `{x}`. */
const normalise = (value) =>
  String(value)
    .replace(/\{\{(\w+)\}\}/g, "{$1}")
    .replace(/\{(\w+),[^}]*\}/g, "{$1}");

const hits = [];

// --- 1 & 2. shared keys must agree ------------------------------------------
const web = new Map(flatten(read(WEB_CATALOG)));
const mobile = new Map(flatten(read(MOBILE_CATALOG)));

const diverged = [];
for (const [key, value] of web) {
  if (!mobile.has(key)) continue;
  if (normalise(value) === normalise(mobile.get(key))) continue;
  diverged.push(key);
  if (!DIVERGENCES.has(key)) {
    hits.push({
      kind: "cross-platform copy drift",
      detail: `${key}\n      web:    ${value}\n      mobile: ${mobile.get(key)}`,
    });
  }
}

// A ledger entry that no longer describes a real difference is stale — the
// list has to shrink honestly, not silently.
for (const key of DIVERGENCES.keys()) {
  if (!diverged.includes(key)) {
    hits.push({
      kind: "stale divergence allowlist entry",
      detail: `${key} — the two catalogs now agree (or the key is gone). Remove it from DIVERGENCES.`,
    });
  }
}

// --- 2b. surface one platform has and the other does not ---------------------
const platformOnly = { web: [], mobile: [] };
for (const [platform, own, other] of [
  ["web", web, mobile],
  ["mobile", mobile, web],
]) {
  const excused = { ...PLATFORM_ONLY_NAMESPACES[platform], ...PLATFORM_ONLY_NAMESPACES.both };
  for (const key of own.keys()) {
    if (other.has(key)) continue;
    if (Object.keys(excused).some((ns) => key === ns || key.startsWith(`${ns}.`))) continue;
    platformOnly[platform].push(key);
  }
  const found = platformOnly[platform].length;
  const ceiling = MAX_PLATFORM_ONLY_KEYS[platform];
  if (found > ceiling) {
    hits.push({
      kind: "platform-only message keys grew",
      detail:
        `${platform}: ${found} keys exist here and not on the other platform, ` +
        `over the ${ceiling} recorded in MAX_PLATFORM_ONLY_KEYS. Add the twin, ` +
        `or record the namespace in PLATFORM_ONLY_NAMESPACES with a reason.`,
    });
  } else if (found < ceiling) {
    hits.push({
      kind: "stale platform-only ceiling",
      detail: `${platform}: down to ${found} from ${ceiling}. Lower MAX_PLATFORM_ONLY_KEYS.${platform}.`,
    });
  }
}

// --- 3. defined but never referenced -----------------------------------------
/**
 * Every `const t = useTranslations("ns")` in a file, including the destructured
 * `const [a, t, tJobs] = await Promise.all([f(), getTranslations("ns"), …])`
 * form. That second shape is not a nicety: `(public)/j/[id]/page.tsx` uses it,
 * and a scanner that only understood the first reported all six `publicJob.*`
 * keys as dead. This gate deletes strings, so a binding it cannot see is a
 * production bug waiting to be committed.
 */
function webBindings(src) {
  const simple = [
    ...src.matchAll(
      /(?:const|let)\s+(\w+)\s*=\s*(?:await\s+)?(?:useTranslations|getTranslations)\(\s*"([^"]+)"\s*\)/g,
    ),
  ].map((m) => ({ variable: m[1], namespace: m[2], at: m.index ?? 0 }));

  const destructured = [];
  for (const m of src.matchAll(
    /(?:const|let)\s*\[([^\]]+)\]\s*=\s*await\s+Promise\.all\(\s*\[([\s\S]*?)\]\s*\)/g,
  )) {
    const names = m[1].split(",").map((n) => n.trim());
    // Position-matched: the nth name binds the nth element.
    const elements = splitTopLevel(m[2]);
    names.forEach((variable, i) => {
      const ns = /(?:useTranslations|getTranslations)\(\s*"([^"]+)"\s*\)/.exec(elements[i] ?? "");
      if (variable && ns) destructured.push({ variable, namespace: ns[1], at: m.index ?? 0 });
    });
  }

  return [...simple, ...destructured];
}

/** Split an array literal's body on commas that are not nested inside brackets. */
function splitTopLevel(body) {
  const parts = [];
  let depth = 0;
  let current = "";
  for (const char of body) {
    if ("([{".includes(char)) depth += 1;
    else if (")]}".includes(char)) depth -= 1;
    if (char === "," && depth === 0) {
      parts.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  if (current.trim()) parts.push(current);
  return parts;
}

function webConsumed() {
  const keys = new Set();
  for (const file of sourceFiles("apps/web/src")) {
    const src = readFileSync(join(ROOT, file), "utf8");
    const bindings = webBindings(src);

    for (const variable of new Set(bindings.map((b) => b.variable))) {
      const call = new RegExp(`\\b${variable}(?:\\.rich)?\\(\\s*"([^"]+)"`, "g");
      for (const m of src.matchAll(call)) {
        const scope = bindings
          .filter((b) => b.variable === variable && b.at < (m.index ?? 0))
          .pop();
        if (scope) keys.add(`${scope.namespace}.${m[1]}`);
      }
    }
  }
  return keys;
}

function mobileConsumed() {
  const keys = new Set();
  for (const file of [...sourceFiles("apps/mobile/src"), ...sourceFiles("apps/mobile/app")]) {
    const src = readFileSync(join(ROOT, file), "utf8");
    for (const m of src.matchAll(/\bt\(\s*"([a-zA-Z][\w.]*)"/g)) keys.add(m[1]);
  }
  return keys;
}

const underDynamic = (key, namespaces) =>
  namespaces.some((ns) => key === ns || key.startsWith(`${ns}.`));

for (const [platform, catalog, consumed, dynamic] of [
  ["web", web, webConsumed(), DYNAMIC_NAMESPACES.web],
  ["mobile", mobile, mobileConsumed(), DYNAMIC_NAMESPACES.mobile],
]) {
  for (const key of catalog.keys()) {
    if (consumed.has(key) || underDynamic(key, dynamic)) continue;
    hits.push({ kind: `unreferenced ${platform} message key`, detail: key });
  }
}

// --- report -------------------------------------------------------------------
/** Top namespaces of a key list, so a number points somewhere. */
function byNamespace(keys) {
  const counts = new Map();
  for (const key of keys) {
    const ns = key.split(".")[0];
    counts.set(ns, (counts.get(ns) ?? 0) + 1);
  }
  return [...counts]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([ns, n]) => `${ns}:${n}`)
    .join(" ");
}

if (hits.length === 0) {
  console.log(`check:i18n — clean. ${web.size} web keys, ${mobile.size} mobile keys.`);

  // A count is not a list. "32 known divergences" told nobody which strings say
  // different things on the same screen, so nobody could work the number down.
  console.log(`\n${diverged.length} known copy divergence(s) — run with --values to see them:`);
  for (const key of diverged) console.log(`  ${key} — ${DIVERGENCES.get(key)}`);
  if (process.argv.includes("--values")) {
    for (const key of diverged) {
      console.log(`\n  ${key}\n    web:    ${web.get(key)}\n    mobile: ${mobile.get(key)}`);
    }
  }

  console.log(
    `\nplatform-only keys (surface one side has and the other does not), at the recorded ceiling:`,
  );
  for (const platform of ["web", "mobile"]) {
    console.log(
      `  ${platform}: ${platformOnly[platform].length} — ${byNamespace(platformOnly[platform])}`,
    );
  }
  process.exit(0);
}

const byKind = hits.reduce((acc, h) => {
  (acc[h.kind] ??= []).push(h);
  return acc;
}, {});

for (const [kind, list] of Object.entries(byKind)) {
  console.error(`\n✖ ${kind} — ${list.length} hit(s)`);
  for (const h of list) console.error(`    ${h.detail}`);
}
console.error(
  `\nTotal: ${hits.length} hit(s).` +
    `\nCatalogs: ${relative(ROOT, join(ROOT, WEB_CATALOG))} and ${relative(ROOT, join(ROOT, MOBILE_CATALOG))}.`,
);
process.exit(1);
