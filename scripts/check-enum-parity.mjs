#!/usr/bin/env node
// Prisma ↔ shared enum mirror gate.
//
// `packages/shared/src/enums.ts` opens with "Mirror of Prisma enums. Keep in
// sync with packages/db/prisma/schema.prisma." Nothing enforced that. The web
// and mobile apps cannot import `@prisma/client`, so the mirror is the only
// vocabulary they have for a DB enum — and a value that exists in the schema
// but not in the mirror is a branch the UI can never take, while a value in the
// mirror but not the schema is a write the database will reject.
//
// The mirror is deliberately partial: 10 of the schema's enums (billing,
// devices, karama, licences) are API-only and have no client-side reader. So
// coverage is NOT the contract — this reports the gap and moves on. The
// contract is that whatever *is* mirrored matches its schema enum exactly.
//
// Exits non-zero on any hit. Prints a grep-friendly report.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SCHEMA = "packages/db/prisma/schema.prisma";
const MIRROR = "packages/shared/src/enums.ts";

const read = (rel) => readFileSync(join(ROOT, rel), "utf8");

/** `enum Foo {\n  A\n  B\n}` → Map("Foo" → ["A", "B"]) */
function prismaEnums(source) {
  const out = new Map();
  for (const m of source.matchAll(/^enum\s+(\w+)\s*\{([^}]*)\}/gm)) {
    const members = m[2]
      .split("\n")
      .map((line) => line.replace(/\/\/.*$/, "").trim())
      .filter(Boolean)
      // A value may carry attributes (`SOME_VALUE @map("x")`); the name is first.
      .map((line) => line.split(/\s+/)[0]);
    out.set(m[1], members);
  }
  return out;
}

/** `export const Foo = {\n  A: "A",\n} as const;` → Map("Foo" → [["A", "A"]]) */
function mirrorEnums(source) {
  const out = new Map();
  for (const m of source.matchAll(/^export const (\w+) = \{([\s\S]*?)\} as const;/gm)) {
    const members = [...m[2].matchAll(/^\s*(\w+)\s*:\s*"([^"]*)"/gm)].map((e) => [e[1], e[2]]);
    out.set(m[1], members);
  }
  return out;
}

const schema = prismaEnums(read(SCHEMA));
const mirror = mirrorEnums(read(MIRROR));

// Refuse to report parity from a bad read. Without this, a regex that stops
// matching (a formatter change, a Prisma syntax bump) reports "clean" for a
// file it never parsed — the gate would pass hardest exactly when it broke.
if (schema.size < 20 || mirror.size < 15) {
  console.error(
    `✖ parsed ${schema.size} schema enums and ${mirror.size} mirrored consts — ` +
      `the files moved or the parser broke. Refusing to report parity from a bad read.`,
  );
  process.exit(1);
}

const hits = [];
const shared = [...mirror.keys()].filter((name) => schema.has(name));

for (const name of shared) {
  const want = schema.get(name);
  const got = mirror.get(name);
  const gotKeys = got.map(([key]) => key);

  for (const key of want) {
    if (!gotKeys.includes(key)) {
      hits.push({
        kind: "value in the schema, missing from the mirror",
        detail: `${name}.${key} — add it to ${MIRROR}. The UI cannot name this value today.`,
      });
    }
  }
  for (const key of gotKeys) {
    if (!want.includes(key)) {
      hits.push({
        kind: "value in the mirror, missing from the schema",
        detail: `${name}.${key} — remove it from ${MIRROR}, or add it to ${SCHEMA}. The database rejects this write.`,
      });
    }
  }
  // The mirror's whole point is that the string equals the Prisma value.
  for (const [key, value] of got) {
    if (key !== value) {
      hits.push({
        kind: "mirror key does not equal its value",
        detail: `${name}.${key} is "${value}" — a Prisma enum serialises as its own name.`,
      });
    }
  }
}

const unmirrored = [...schema.keys()].filter((name) => !mirror.has(name));
const clientOnly = [...mirror.keys()].filter((name) => !schema.has(name));

if (hits.length === 0) {
  console.log(
    `check:enum-parity — clean. ${shared.length} enums mirrored and matching, ` +
      `${unmirrored.length} schema enums API-only, ${clientOnly.length} client-only.`,
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
console.error(
  `\nTotal: ${hits.length} hit(s). ${MIRROR} is the only enum vocabulary web and ` +
    `mobile have — they cannot import @prisma/client.`,
);
process.exit(1);
