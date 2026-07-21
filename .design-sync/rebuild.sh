#!/bin/sh
# design-sync rebuild: compile the Tailwind sheet ui-web's classes need, then
# run the converter. Run from the repo root. Extra args pass through to
# package-build.mjs (e.g. nothing, or --skip-dts on fix-loop iterations).
set -e
( cd .design-sync/ds-styles && ../../apps/web/node_modules/.bin/tailwindcss \
    -c ./tailwind.config.cjs -i ./input.css \
    -o ../../packages/ui-web/dist/ds-styles.css --minify )
node .ds-sync/package-build.mjs --config .design-sync/config.json \
  --node-modules packages/ui-web/node_modules \
  --entry ./packages/ui-web/dist/index.js --out ./ds-bundle "$@"
