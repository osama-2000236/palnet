// build-brand-icons.mjs — rasterize the canonical brand mark
// (packages/ui-tokens/assets/logo-mark.svg) into the PNGs that Expo and
// the web manifest require.
//
// Outputs:
//   apps/mobile/assets/icon.png            (1024, transparent)
//   apps/mobile/assets/adaptive-icon.png   (1024, brand-50 bg, 22% pad)
//   apps/mobile/assets/favicon.png         (48,   transparent)
//   apps/mobile/assets/splash.png          (2048, brand-50 bg, 45% pad)
//   apps/web/public/icon-192.png           (192,  transparent)
//   apps/web/public/icon-512.png           (512,  transparent)
//
// Run:  pnpm tokens:icons
// Re-run any time logo-mark.svg changes.

import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const SRC_MARK = resolve(repoRoot, "packages/ui-tokens/assets/logo-mark.svg");
const MOBILE_ASSETS = resolve(repoRoot, "apps/mobile/assets");

const OUTPUTS = [
  { file: "icon.png",          size: 1024, src: SRC_MARK, background: null },
  { file: "adaptive-icon.png", size: 1024, src: SRC_MARK,
    background: { r: 244, g: 246, b: 239, alpha: 1 }, pad: 0.22 },
  { file: "favicon.png",       size: 48,   src: SRC_MARK, background: null },
  { file: "splash.png",        size: 2048, src: SRC_MARK,
    background: { r: 244, g: 246, b: 239, alpha: 1 }, pad: 0.45 },
  { file: "icon-192.png",      size: 192,  src: SRC_MARK, background: null,
    dest: resolve(repoRoot, "apps/web/public/icon-192.png") },
  { file: "icon-512.png",      size: 512,  src: SRC_MARK, background: null,
    dest: resolve(repoRoot, "apps/web/public/icon-512.png") },
];

async function build() {
  const svgBuf = readFileSync(SRC_MARK);
  for (const out of OUTPUTS) {
    const dest = out.dest ?? join(MOBILE_ASSETS, out.file);
    mkdirSync(dirname(dest), { recursive: true });

    if (out.background) {
      // Render the mark inset by `pad`, composited onto the brand-50 bg.
      const innerSize = Math.round(out.size * (1 - out.pad * 2));
      const inner = await sharp(svgBuf, { density: 384 })
        .resize(innerSize, innerSize, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer();
      await sharp({
        create: { width: out.size, height: out.size, channels: 4, background: out.background },
      })
        .composite([{ input: inner, gravity: "center" }])
        .png()
        .toFile(dest);
    } else {
      await sharp(svgBuf, { density: 384 })
        .resize(out.size, out.size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toFile(dest);
    }

    // eslint-disable-next-line no-console
    console.warn(`✓ ${dest}`);
  }
}

build().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("brand icons build failed:", err);
  process.exit(1);
});
