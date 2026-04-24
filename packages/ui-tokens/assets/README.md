# Baydar brand assets

Authoritative source for the Baydar (بيدر) mark, wordmark, and app icons.
**Do not inline-edit these in downstream apps.** If you need a variant, add
it here, regenerate consumers.

## Files

| File                   | Use                                                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `logo-mark.svg`        | Filled mark (olive circle + cream wheat head). Default for app icons, favicons, and hero positioning.               |
| `logo-mark-mono.svg`   | Monochrome mark. Uses `currentColor` — style via CSS. Use on light-on-dark or when color needs to match a surface.  |
| `logo-wordmark-ar.svg` | Mark + Arabic wordmark "بيدر". RTL-friendly; mark is to the right of the text. Default wordmark in Arabic contexts. |
| `logo-wordmark-en.svg` | Mark + Latin wordmark "Baydar". LTR layout. Use in English contexts and for non-Arabic-speaking channels.           |

## Brand concept

Baydar (بيدر) literally means **threshing floor** — the place where the
harvest is gathered. The mark is a stylized wheat head on a solid olive
field, carrying two signals:

1. **Harvest / accumulation** — where a professional life gathers.
2. **Palestinian agriculture** — olive tone + wheat are staples of the
   terraced landscape.

No crescent, no olive branch, no map outline. Those symbols are already
politically charged; Baydar stays on profession and livelihood.

## Color tokens

- Primary field: `--brand-600` / `#526030`
- Grain highlight: `--brand-50` / `#f4f6ef`
- Text in wordmark: `--brand-700` / `#3f4a26`

If colors drift from these tokens, the mark is wrong — fix the token, not
the SVG.

## Generating raster assets

Next.js 15 renders the SVG directly via `app/icon.svg`. Mobile (Expo)
requires raster PNGs. Regenerate with:

```bash
# from repo root
pnpm -w tokens:icons
```

(The `tokens:icons` script rasterizes to the Expo icon sizes declared in
`apps/mobile/app.json` using `sharp`.)

## Minimum size

The filled mark is legible down to 24×24. Below that, drop the grain
detail and use the wordmark's circle alone.

## Clear space

At least 0.25× the mark's diameter on all sides before any adjacent UI
element. Never crop the ring.
