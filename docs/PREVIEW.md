# Baydar — Live Preview Runbook (Android now, iOS deferred)

How to run the real app on a physical **Android** phone (and the web app in a
browser) against a local backend, plus the exact reason iOS-on-device is a
separate, credentialed step.

> Why a custom build and not Expo Go? The mobile app ships native modules that
> Expo Go cannot load — `@sentry/react-native`, `expo-notifications`,
> `react-native-reanimated@4` + `react-native-worklets`, `expo-secure-store`,
> `react-native-gesture-handler`. You need a **custom dev client** (EAS build).
> A lower-fidelity Expo Go path is documented at the end as a fallback.

Bundle id / package: `ps.baydar.app`. Expo SDK 54, RN 0.81, React 19.

---

## 0. Prerequisites

- Node ≥ 20, `pnpm` ≥ 9 (`corepack enable`).
- A Postgres database — either a free [Neon](https://neon.tech) branch or local Postgres.
- `npm i -g eas-cli` and an Expo account (`eas login`).
- Android phone + PC on the **same Wi-Fi**.

---

## 1. Install

```bash
pnpm install --frozen-lockfile
```

## 2. Backend env + database

Copy the example and fill the required secrets (only these are needed to boot):

```bash
cp .env.example .env.local
```

Set in `.env.local`:

```
DATABASE_URL=postgresql://<user>:<pass>@<host>/baydar?schema=public
DIRECT_URL=postgresql://<user>:<pass>@<host>/baydar?schema=public
JWT_ACCESS_SECRET=<32+ random chars>
JWT_REFRESH_SECRET=<32+ random chars>
INTERNAL_CRON_TOKEN=<32+ random chars>
```

Everything else (Resend mail, HyperPay, R2 media, Sentry) is optional for a
preview — mail falls back to a console transport, payments stay in their gated
"coming soon" state, and analytics stay off.

Generate the client, run migrations, seed demo data (Palestinian profiles/jobs):

```bash
pnpm --filter @baydar/db generate
pnpm db:migrate
pnpm db:seed
```

## 3. Start the API

```bash
pnpm --filter @baydar/api dev      # NestJS on http://localhost:4000  (base path /api/v1)
```

Leave it running. Health check: open `http://localhost:4000/api/v1/health` (or any public route) in a browser.

## 4. Point the phone at your PC

Expo Go / a dev client on a phone cannot reach `localhost` — it must hit your
PC's LAN IP. Find it:

```bash
ipconfig            # Windows → IPv4 Address, e.g. 192.168.1.3
```

Set it in `apps/mobile/.env` (the file already exists — update the IP to match):

```
EXPO_PUBLIC_API_URL=http://<PC-LAN-IP>:4000/api/v1
EXPO_PUBLIC_WS_URL=http://<PC-LAN-IP>:4000
EXPO_PUBLIC_DEFAULT_LOCALE=ar-PS
```

## 5. Build the Android dev client (one time, ~10–15 min in the cloud)

```bash
cd apps/mobile
eas build --profile development --platform android
```

When it finishes, EAS gives a URL/QR — open it on the phone and install the APK
(allow "install from unknown sources"). This APK bundles the native modules; you
only rebuild it when native deps change.

## 6. Run it live

```bash
pnpm --filter @baydar/mobile start      # Metro dev server + QR
```

Open the installed **Baydar dev client** on the phone → scan the QR (or enter the
LAN URL). The app loads from Metro with live reload. Arabic + RTL are forced at
boot; toggle theme in Settings → Appearance.

## 7. Web preview (optional, no build)

```bash
pnpm --filter @baydar/web dev           # http://localhost:3000
```

---

## iOS on a physical iPhone — deferred (needs Apple credentials)

The host here is Windows, so there is **no local iOS Simulator**. Previewing on a
real iPhone requires:

1. An **Apple Developer account** ($99/yr).
2. Register the device UDID (or use TestFlight internal testing).
3. `eas build --profile development --platform ios` → install via TestFlight or
   ad-hoc, then `pnpm --filter @baydar/mobile start` and scan the QR as in step 6.

Until the Apple account exists, use the Android dev client above to see the full
app. The universal-links config (`applinks:baydar.ps`) also needs the real Apple
Team ID before iOS deep links resolve.

---

## Fallback: Expo Go over LAN (lower fidelity, zero build)

If you want to skip the EAS build and accept degraded features (no Sentry, no
push notifications), Expo Go can load most screens:

```bash
# steps 1–4 above, then:
pnpm --filter @baydar/mobile start
```

Scan the QR in the **Expo Go** app. Push, error-reporting, and any
reanimated-4-only interactions may misbehave; use the dev-client path for a true
preview.

---

## Sanity gate before a preview session

```bash
pnpm lint:tokens && pnpm type-check && pnpm --filter @baydar/mobile type-check
```

Green means the app will bundle. If Metro serves a stale cache, restart with
`pnpm --filter @baydar/mobile start -- --clear`.
