// Push registration helper. Called from the auth boot path after login so
// the server has an Expo push token to target. Silently no-ops on simulators,
// web, or when the user denies permission — push is not essential for the
// app to function.
//
// We register with the API by (deviceId, token, platform). deviceId comes
// from SecureStore so it survives app restarts; token rotates on OS-initiated
// events (app reinstall, OS restore) and the API upserts on the composite key.

import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { apiCall } from "./api";
import { getAccessToken, getDeviceId } from "./session";

function platformTag(): "ios" | "android" | "web" {
  if (Platform.OS === "ios") return "ios";
  if (Platform.OS === "android") return "android";
  return "web";
}

/**
 * Request push permission (iOS prompts, Android auto-grants on <13) and
 * register the resulting Expo token with the API. Idempotent — safe to call
 * on every app boot after login.
 */
export async function registerForPush(): Promise<void> {
  // Simulators can't receive push. Bail fast rather than hitting a native
  // error path.
  if (!Device.isDevice) return;

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== "granted") {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }
  if (status !== "granted") return;

  // Android needs a channel configured before any notification fires or
  // they get silently dropped on API 26+.
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  let tokenRes;
  try {
    tokenRes = await Notifications.getExpoPushTokenAsync();
  } catch {
    // No projectId configured, or network hiccup. Not worth surfacing.
    return;
  }
  const token = tokenRes.data;
  if (!token) return;

  const apiToken = await getAccessToken();
  if (!apiToken) return;
  const deviceId = await getDeviceId();

  await apiCall("/account/push-tokens", {
    method: "POST",
    token: apiToken,
    body: { deviceId, token, platform: platformTag() },
  }).catch(() => {
    // Push is best-effort — a failed registration shouldn't block login.
  });
}

/**
 * Revoke the push token for this device. Called on logout. The server also
 * deletes the row inside the logout transaction as a belt-and-braces so this
 * is purely best-effort from the client side.
 */
export async function unregisterForPush(): Promise<void> {
  const apiToken = await getAccessToken();
  if (!apiToken) return;
  const deviceId = await getDeviceId();
  await apiCall(`/account/push-tokens/${encodeURIComponent(deviceId)}`, {
    method: "DELETE",
    token: apiToken,
  }).catch(() => undefined);
}
