import { type RegisterDeviceTokenBody } from "@baydar/shared";
import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Device from "expo-device";
import type * as NotificationsModule from "expo-notifications";
import { router } from "expo-router";
import { Platform } from "react-native";

import { apiCall } from "./api";
import { routeFromUrl } from "./linking";

const IS_EXPO_GO = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let notificationHandlerInstalled = false;
let notificationsPromise: Promise<typeof NotificationsModule> | null = null;

export function installNotificationHandlers(): () => void {
  let disposed = false;
  let subscription: ReturnType<
    typeof NotificationsModule.addNotificationResponseReceivedListener
  > | null = null;

  void loadNotificationsAsync()
    .then((Notifications) => {
      if (!Notifications || disposed) return;

      if (!notificationHandlerInstalled) {
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: false,
            shouldSetBadge: true,
          }),
        });
        notificationHandlerInstalled = true;
      }

      subscription = Notifications.addNotificationResponseReceivedListener((response) => {
        const deepLink = response.notification.request.content.data.deepLink;
        if (typeof deepLink !== "string") return;

        const route = routeFromUrl(deepLink);
        if (route) router.push(route as never);
      });
    })
    .catch((error) => {
      if (__DEV__) {
        console.warn("[push] Notification handlers unavailable.", error);
      }
    });

  return () => {
    disposed = true;
    subscription?.remove();
  };
}

export async function registerForPushAsync(): Promise<string | null> {
  const platform = getDevicePlatform();
  if (!platform) return null;

  const Notifications = await loadNotificationsAsync();
  if (!Notifications) return null;

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

async function loadNotificationsAsync(): Promise<typeof NotificationsModule | null> {
  // Expo Go on SDK 53+ removed Android remote push token support, and merely
  // evaluating expo-notifications triggers its Expo Go warning overlay.
  if (IS_EXPO_GO) {
    if (__DEV__) {
      console.debug("[push] Skipping notifications: running inside Expo Go.");
    }
    return null;
  }

  notificationsPromise ??= import("expo-notifications");
  return notificationsPromise;
}

function getDevicePlatform(): RegisterDeviceTokenBody["platform"] | null {
  if (Platform.OS === "ios") return "ios";
  if (Platform.OS === "android") return "android";
  return null;
}
