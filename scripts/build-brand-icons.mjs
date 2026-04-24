#!/usr/bin/env node
// Rasterize packages/ui-tokens/assets/*.svg into the PNG sizes Expo needs.
//
// Expo refuses to build without the raster icon/adaptive-icon/splash PNGs
// declared in apps/mobile/app.json. This script regenerates them from the
// source SVG so the SVG stays the single source of truth; PNGs are build
// artefacts that can be regenerated on demand.
//
// Run once after cloning (and any time the mark changes):
//   pnpm run tokens:icons
//
// Deps: `sharp` (dev, workspace root). If sharp isn't installed, this fails
// with a clear error message rather than a cryptic stack trace.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

const SRC_MARK = join(repoRoot, "packages/ui-tokens/assets/logo-mark.svg");
const SRC_MARK_TRANSPARENT = join(
  repoRoot,
  "packages/ui-tokens/assets/logo-mark-mono.svg",
);
const MOBILE_ASSETS = join(repoRoot, "apps/mobile/assets");

// Expo expected paths. Keep in sync with apps/mobile/app.json.
const OUTPUTS = [
  { file: "icon.png", size: 1024, src: SRC_MARK, background: null },
  // Adaptive icon foreground needs padding because Android masks it; oversize
  // the canvas and center-scale so the system mask doesn't clip the circle.
  {
    file: "adaptive-icon.png",
    size: 1024,
    src: SRC_MARK,
    background: { r: 244, g: 246, b: 239, alpha: 1 },
    pad: 0.22,
  },
  { file: "favicon.png", size: 48, src: SRC_MARK, background: null },
  // Splash = mark on brand-50 field so the first paint feels branded rather
  // than a white flash.
  {
    file: "splash.png",
    size: 2048,
    src: SRC_MARK,
    background: { r: 244, g: 246, b: 239, alpha: 1 },
    pad: 0.45,
  },
];

async function main() {
  let sharp;
  try {
    sharp = (await import("sharp")).default;
  } catch {
    console.error(
      "sharp is not installed. Run `pnpm add -Dw sharp` at the repo root first.",
    );
    process.exit(1);
  }

  mkdirSync(MOBILE_ASSETS, { recursive: true });

  for (const out of OUTPUTS) {
    const svg = readFileSync(out.src);
    const dest = join(MOBILE_ASSETS, out.file);

    if (out.pad && out.background) {
      // Render the mark at a reduced size inside a padded canvas.
      const inner = Math.round(out.size * (1 - out.pad));
      const margin = Math.floor((out.size - inner) / 2);
      const buffer = await sharp(svg, { density: 600 })
        .resize(inner, inner)
        .png()
        .toBuffer();
      await sharp({
        create: {
          width: out.size,
          height: out.size,
          channels: 4,
          background: out.background,
        },
      })
        .composite([{ input: buffer, top: margin, left: margin }])
        .png()
        .toFile(dest);
    } else {
      await sharp(svg, { density: 600 }).resize(out.size, out.size).png().toFile(dest);
    }

    console.log(`wrote ${dest}`);
  }

  // .gitkeep so the directory stays tracked even if PNGs are gitignored
  // later. (They're committed today; this is future-proofing.)
  writeFileSync(join(MOBILE_ASSETS, ".gitkeep"), "");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
