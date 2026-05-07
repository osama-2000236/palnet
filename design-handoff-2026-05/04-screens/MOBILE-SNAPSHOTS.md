# Mobile Snapshots — [HUMAN] Required

> **STATUS: STUB.**
>
> AI cannot drive iOS simulator + Android emulator. Lead runs steps below.
> ~30 min total once simulators are warm.

## Save path

```
design-handoff-2026-05/04-screens/{screen}/mobile/{ios|android}-{locale}-default.png
```

## iOS (macOS only)

```bash
# In one terminal — start API + DB
pnpm --filter @baydar/api dev

# In another — start Expo
cd apps/mobile
pnpm ios
# Wait for simulator to boot + bundle to load.
```

In simulator: Settings → General → Language & Region → Add Arabic (Saudi Arabia) → Reorder Arabic on top → Reset simulator.

For each route, navigate then capture (Cmd+S in simulator):

1. `/feed` → save as `feed/mobile/ios-ar-PS-default.png`
2. `/jobs` → `jobs/mobile/ios-ar-PS-default.png`
3. `/messages` → ...
4. `/network`, `/notifications`, `/search`, `/onboarding`, `/settings`

Repeat with simulator language reset to English → save as `*-en-*.png`.

## Android (Windows / macOS / Linux)

```powershell
# Start Android Studio, boot Pixel 7 emulator first.
cd apps\mobile
pnpm android
```

Set device language: Settings → System → Languages → Add Arabic.

Capture: Power + Volume Down. Pull from device:

```powershell
adb pull /sdcard/Pictures/Screenshots/. design-handoff-2026-05\04-screens\.
```

## Fallback — Expo web preview (NOT a substitute)

If neither simulator available, can render mobile app in browser as approximate visual — but layout, safe areas, fonts, gesture behavior diverge from native.

```powershell
# Terminal 1
pnpm --filter @baydar/api dev
# Terminal 2
pnpm --filter @baydar/mobile web
# Then point capture-snapshots.mjs at port 8081 and crop to 375×812.
```

Tag any expo-web captures clearly: `web-approx-{locale}-default.png`. Do not ship as `ios-*` or `android-*`.

## Minimum

8 screens × 2 platforms × 2 locales = **32 PNGs**.

## Verify

```powershell
(Get-ChildItem design-handoff-2026-05\04-screens -Recurse -Filter "*ios*.png","*android*.png").Count
```

Expect `>=32`.
