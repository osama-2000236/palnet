import { type RegisterDeviceTokenBody } from "@baydar/shared";
import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { Platform } from "react-native";

import { apiCall } from "./api";
import { routeFromUrl } from "./linking";

const IS_EXPO_GO =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let notificationHandlerInstalled = false;

export function installNotificationHandlers(): () => void {
  if (!notificationHandlerInstalled) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: false,
        shouldSetBadge: true,
      }),
    });
    notificationHandlerInstalled = true;
  }

  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const deepLink = response.notification.request.content.data.deepLink;
    if (typeof deepLink !== "string") return;

    const route = routeFromUrl(deepLink);
    if (route) router.push(route as never);
  });

  return () => {
    subscription.remove();
  };
}

export async function registerForPushAsync(): Promise<string | null> {
  const platform = getDevicePlatform();
  if (!platform) return null;

  // Expo Go on SDK 53+ removed remote push token support; SDK 52 still warns.
  // Skip token acquisition entirely so the app stays clean inside the sandbox.
  if (IS_EXPO_GO) {
    if (__DEV__) {
      console.debug("[push] Skipping push registration: running inside Expo Go.");
    }
    return null;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  if (!Device.isDevice) return null;

  const permission = await Notifications.getPermissionsAsync();
  const finalStatus =
    permission.status === "granted"
      ? permission.status
      : (await Notifications.requestPermissionsAsync()).status;
  if (finalStatus !== "granted") return null;

  const token = (await Notifications.getExpoPushTokenAsync()).data;
  const body: RegisterDeviceTokenBody = { token, platform };
  await apiCall("/notifications/devices", {
    method: "POST",
    body,
  });

  return token;
}

function getDevicePlatform(): RegisterDeviceTokenBody["platform"] | null {
  if (Platform.OS === "ios") return "ios";
  if (Platform.OS === "android") return "android";
  return null;
}
