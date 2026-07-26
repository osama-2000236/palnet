// Tile a screenshot directory into labelled contact sheets.
//
//   node e2e/contact-sheet.mjs [--in=DIR] [--out=DIR] [--cols=4] [--rows=3]
//                              [--filter=substring] [--tile-h=440]
//
// Reviewing 368 full-page PNGs one at a time is the reason the rubric pass
// kept getting deferred. A contact sheet makes the triage pass tractable:
// composition, hierarchy and obvious breakage read fine at tile size, and
// anything suspicious gets opened at full resolution afterwards.
//
// Tiles are top-cropped rather than squashed. Full-page shots differ wildly in
// height, and scaling them to a common box destroys exactly the proportion the
// review is judging; the top of the page is also where hierarchy lives.
import { readdir, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const arg = (name, fallback) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split("=").slice(1).join("=") : fallback;
};

const IN = arg("in", path.resolve(import.meta.dirname, "../.qa-shots"));
const OUT = arg("out", path.join(IN, "_sheets"));
const COLS = Number(arg("cols", 4));
const ROWS = Number(arg("rows", 3));
const TILE_W = Number(arg("tile-w", 320));
const TILE_H = Number(arg("tile-h", 440));
const LABEL_H = 22;
const FILTER = arg("filter", null);

const CELL_W = TILE_W;
const CELL_H = TILE_H + LABEL_H;

function labelSvg(text) {
  const safe = text.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);
  return Buffer.from(
    `<svg width="${CELL_W}" height="${LABEL_H}">
       <rect width="100%" height="100%" fill="#14140f"/>
       <text x="6" y="15" font-family="monospace" font-size="12" fill="#e8e4d9">${safe}</text>
     </svg>`,
  );
}

async function tile(file) {
  // Scale to the tile width, then take the top TILE_H rows.
  //
  // NOT `fit: "cover"`: cover scales until BOTH dimensions reach the target,
  // so a short desktop page (1440x1200 into 320x440) scales by *height* and
  // then crops 208px off the sides — which on an RTL layout silently removes
  // the start of every line. Width-first is the only crop that keeps a page
  // horizontally whole.
  const scaled = sharp(file).resize({ width: TILE_W, withoutEnlargement: false });
  const buffer = await scaled.toBuffer();
  const { height = TILE_H } = await sharp(buffer).metadata();
  if (height >= TILE_H) {
    return sharp(buffer).extract({ left: 0, top: 0, width: TILE_W, height: TILE_H }).toBuffer();
  }
  return sharp(buffer)
    .extend({ bottom: TILE_H - height, background: "#14140f" })
    .toBuffer();
}

async function main() {
  await mkdir(OUT, { recursive: true });
  let files = (await readdir(IN)).filter((f) => f.endsWith(".png")).sort();
  if (FILTER) files = files.filter((f) => f.includes(FILTER));
  if (files.length === 0) throw new Error(`no PNGs in ${IN}${FILTER ? ` matching ${FILTER}` : ""}`);

  const perSheet = COLS * ROWS;
  const sheets = [];
  for (let i = 0; i < files.length; i += perSheet) {
    const batch = files.slice(i, i + perSheet);
    const composites = [];
    for (const [index, name] of batch.entries()) {
      const col = index % COLS;
      const row = Math.floor(index / COLS);
      composites.push({
        input: await tile(path.join(IN, name)),
        left: col * CELL_W,
        top: row * CELL_H + LABEL_H,
      });
      composites.push({
        input: labelSvg(name.replace(/\.png$/, "")),
        left: col * CELL_W,
        top: row * CELL_H,
      });
    }
    const sheetName = `sheet-${String(sheets.length + 1).padStart(2, "0")}.png`;
    await sharp({
      create: {
        width: COLS * CELL_W,
        height: ROWS * CELL_H,
        channels: 3,
        background: "#14140f",
      },
    })
      .composite(composites)
      .png()
      .toFile(path.join(OUT, sheetName));
    sheets.push({ sheet: sheetName, files: batch });
    process.stdout.write(`${sheetName}  ${batch.length} tiles\n`);
  }

  await writeFile(path.join(OUT, "_index.json"), JSON.stringify(sheets, null, 2));
  process.stdout.write(`\n${files.length} shots -> ${sheets.length} sheets in ${OUT}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
