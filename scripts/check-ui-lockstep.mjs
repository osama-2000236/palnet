#!/usr/bin/env node
// Design-system lockstep gate.
//
// CLAUDE.md: "When you build a component in packages/ui-web, stub the mobile
// twin in packages/ui-native in the same commit. Same prop names, same variant
// names. Drift is how design systems rot."
//
// Nothing enforced that. The two packages now export 40 components in common,
// 14 only on web and 14 only on native — and a chunk of that is the same
// concept under two names (`Tabs` vs `SegmentedControl`), which is exactly the
// rot the rule was written against.
//
// This does not fix the drift. It freezes it: every component that exists on
// one side only must be listed below with a reason, so the list can shrink
// deliberately and cannot grow silently. A new component with no twin fails
// here, in the same commit that added it.
//
// Exits non-zero on any hit. Prints a grep-friendly report.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

/**
 * Platform idioms — the same job, done the way each platform expects. A web
 * `Menu` is not a native `ActionSheet` and pretending otherwise would make both
 * worse.
 */
const PLATFORM_IDIOMS = {
  web: {
    Menu: "native uses ActionSheet — a bottom sheet, not a dropdown",
    MenuItemSpec: "type for Menu",
    ReportDialog: "native uses ReportSheet, the same flow in a sheet",
    Alert: "native folds this into StateMessage's `tone` prop",
    RoomRow: "native renders rooms through RecordCard",
    TypingIndicator: "inlined in native's message thread",
    Composer: "native uses ComposerEntry — a tap target that opens a screen",
    ProfileHeader: "native composes this from Avatar + Surface in the screen",
    ReactionPicker: "native uses a long-press ActionSheet",
    REACTION_TINT: "web-only styling helper",
    GroupedMessage: "type from groupMessages, web-only helper",
  },
  native: {
    ActionSheet: "platform idiom — see web's Menu",
    ReportSheet: "platform idiom — see web's ReportDialog",
    Sheet: "platform idiom — no web equivalent needed",
    ComposerEntry: "platform idiom — see web's Composer",
    AppHeader: "native stack header; web's chrome is AppShell",
    ThemeProvider: "native reads tokens through context; web uses CSS variables",
    NativeTheme: "type for ThemeProvider",
    NativeTokens: "type for the native token bundle",
    ColorScheme: "type for ThemeProvider",
  },
};

/**
 * Genuine drift. Each of these is one concept that ended up with two names or
 * exists on one platform by accident. Shrinking this list is the point; adding
 * to it should be an argument, not a reflex.
 */
const KNOWN_DRIFT = {
  web: {
    Tabs: "same concept as native's SegmentedControl, different name and props",
    Tab: "part of Tabs",
    TabPanel: "part of Tabs",
  },
  native: {
    SegmentedControl: "same concept as web's Tabs — converge the name and props",
    StateMessage: "merges web's EmptyState + Alert; native's `tone` API is the better one",
    SearchField: "web only has AppShellSearch, which is chrome-bound",
  },
};

function exportedNames(indexPath) {
  const source = readFileSync(join(ROOT, indexPath), "utf8");
  const names = new Set();
  for (const block of source.matchAll(/export\s*(?:type\s*)?\{([^}]+)\}/g)) {
    for (let name of block[1].split(",")) {
      name = name
        .trim()
        .replace(/^type\s+/, "")
        .split(/\s+as\s+/)
        .pop()
        .trim();
      if (name) names.add(name);
    }
  }
  return names;
}

const web = exportedNames("packages/ui-web/src/index.ts");
const native = exportedNames("packages/ui-native/src/index.ts");

if (web.size < 50 || native.size < 50) {
  console.error(
    `✖ parsed ${web.size} web and ${native.size} native exports — the index files ` +
      `moved or the parser broke. Refusing to report drift from a bad read.`,
  );
  process.exit(1);
}

/** Prop/variant type aliases travel with their component; only components pair up. */
const TYPE_SUFFIX =
  /(Props|Labels|Variant|Size|Tone|Kind|Style|Item|Action|Options|Value|Direction|Author|Counts|Media|Context|Reason|Target|Subject|Motifs?|Result)$/;
const isComponent = (name) => /^[A-Z]/.test(name) && !TYPE_SUFFIX.test(name);

const hits = [];

for (const [platform, own, other] of [
  ["web", web, native],
  ["native", native, web],
]) {
  const idioms = PLATFORM_IDIOMS[platform];
  const drift = KNOWN_DRIFT[platform];

  for (const name of own) {
    if (!isComponent(name) || other.has(name)) continue;
    if (idioms[name] || drift[name]) continue;
    hits.push({
      kind: `${platform}-only component with no twin and no entry`,
      detail:
        `${name} — add the twin to ${platform === "web" ? "ui-native" : "ui-web"}, ` +
        `or record why it is platform-specific in scripts/check-ui-lockstep.mjs.`,
    });
  }

  // An entry describing a component that no longer exists, or that has since
  // gained a twin, is stale. The ledger has to shrink honestly.
  for (const [name, reason] of [...Object.entries(idioms), ...Object.entries(drift)]) {
    if (!own.has(name)) {
      hits.push({
        kind: "stale lockstep entry",
        detail: `${platform}/${name} is no longer exported (${reason}). Remove it.`,
      });
    } else if (other.has(name)) {
      hits.push({
        kind: "stale lockstep entry",
        detail: `${platform}/${name} now exists on both sides (${reason}). Remove it.`,
      });
    }
  }
}

const paired = [...web].filter((n) => isComponent(n) && native.has(n)).length;
const drifting = Object.keys(KNOWN_DRIFT.web).length + Object.keys(KNOWN_DRIFT.native).length;

if (hits.length === 0) {
  console.log(
    `check:ui-lockstep — clean. ${paired} paired components, ` +
      `${drifting} known drift entries to reconcile.`,
  );
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
console.error(`\nTotal: ${hits.length} hit(s). See CLAUDE.md — web and mobile stay in lockstep.`);
process.exit(1);
