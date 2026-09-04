#!/bin/sh
# design-sync rebuild: compile the Tailwind sheet ui-web's classes need, then
# run the converter. Run from the repo root. Extra args pass through to
# package-build.mjs (e.g. nothing, or --skip-dts on fix-loop iterations).
set -e

# The converter is NOT vendored here, deliberately: `.ds-sync/` ships with the
# `/design-sync` skill, which owns its version. A copy checked in beside the
# product would go stale the first time that skill updated, and nothing here
# would notice.
#
# Without this guard the failure is `node: Cannot find module
# '.ds-sync/package-build.mjs'` — raised *after* the Tailwind step has already
# rewritten packages/ui-web/dist/ds-styles.css, so you get a half-finished
# rebuild plus an error naming an internal path rather than the thing to do.
# That is what "design-sync: blocked" meant for a whole round, with no
# diagnosis attached to it.
if [ ! -f .ds-sync/package-build.mjs ]; then
  echo "design-sync: the converter is not installed." >&2
  echo "" >&2
  echo "  .ds-sync/package-build.mjs is missing. It ships with the /design-sync" >&2
  echo "  skill — install that skill, then re-run this from the repo root." >&2
  echo "" >&2
  echo "  Everything else on the repo side is ready: the Tailwind step below" >&2
  echo "  compiles clean, .design-sync/config.json is populated, and the 32" >&2
  echo "  previews in .design-sync/previews/ are committed. Read" >&2
  echo "  .design-sync/NOTES.md before re-syncing." >&2
  exit 1
fi

( cd .design-sync/ds-styles && ../../apps/web/node_modules/.bin/tailwindcss \
    -c ./tailwind.config.cjs -i ./input.css \
    -o ../../packages/ui-web/dist/ds-styles.css --minify )
node .ds-sync/package-build.mjs --config .design-sync/config.json \
  --node-modules packages/ui-web/node_modules \
  --entry ./packages/ui-web/dist/index.js --out ./ds-bundle "$@"
