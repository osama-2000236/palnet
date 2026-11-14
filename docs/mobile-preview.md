# Android preview on a physical device

The connected device must receive a build whose API URL is reachable from the phone. Do not use `localhost`, an emulator-only loopback address, or a made-up production URL.

## AWS preview

1. Complete the staging deployment in `infrastructure/aws/README.md` and verify `/api/v1/health` from the public staging API URL.
2. Configure the staging Expo/EAS secrets, especially `EXPO_PUBLIC_API_URL=https://<staging-api-host>/api/v1`.
3. Build the existing `preview` profile:

   ```powershell
   pnpm --filter @baydar/mobile exec npx --yes eas-cli@latest build --profile preview --platform android --non-interactive
   ```

4. Download the resulting internal-distribution APK and install it on the connected Android device:

   ```powershell
   adb install -r path\to\baydar-preview.apk
   ```

5. Test Arabic and English, RTL/LTR, login, profile editing, notifications, and payment error handling on the device. Capture the EAS build URL and device model with the verification result.

## Local development

For local development only, start the API and Expo server on the workstation, use the workstation's LAN IP for `EXPO_PUBLIC_API_URL`, and ensure Windows Firewall allows the API port. A physical phone cannot reach an API listening only on `127.0.0.1`.

A successful EAS build alone is not device verification; install the APK and complete the smoke tests above.
