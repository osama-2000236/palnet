// Bottom-tab AppShell for the authenticated app. Five visible entries per the
// Sprint 21 mobile decision: feed, network, messages, notifications, profile.
// Jobs, search, composer, detail routes, onboarding, and edit screens stay
// pushable hidden routes so primary navigation stays focused and touch-safe.

import { WsNotificationEvent } from "@baydar/shared";
import { nativeTokens } from "@baydar/ui-native";
import { Tabs, router, usePathname } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { z } from "zod";

import { LoadingIntro } from "@/components/LoadingIntro";
import { apiFetch, ApiRequestError } from "@/lib/api";
import { cachedProfileStatus, fetchProfileStatus } from "@/lib/profile-state";
import { registerForPushAsync } from "@/lib/push";
import { clearSession, getAccessToken, readSession } from "@/lib/session";
import { subscribeSse } from "@/lib/sse";
import { useNetworkStore } from "@/store/network";

import { AppGateError } from "./_tabs/AppGateError";
import {
  TabButton,
  TabIcon,
  TabLabel,
  hiddenFullScreenTabOptions,
  hiddenTabOptions,
} from "./_tabs/TabParts";

const UnreadCountEnvelope = z.object({ count: z.number().int().nonnegative() });

export default function AppTabsLayout(): JSX.Element {
  const { t } = useTranslation();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const isConnected = useNetworkStore((state) => state.isConnected);
  const [notificationBadge, setNotificationBadge] = useState<number>(0);
  const [gateState, setGateState] = useState<"checking" | "ready" | "error">("checking");

  const verifyGate = useCallback(async (): Promise<void> => {
    setGateState((current) => (current === "ready" ? current : "checking"));
    const session = await readSession();
    if (!session) {
      router.replace("/(auth)/login");
      return;
    }

    const isOnboardingRoute = pathname.includes("/onboarding");

    if (isOnboardingRoute) {
      try {
        const status = await fetchProfileStatus(session.tokens.accessToken);
        if (status.status === "complete") {
          router.replace("/(app)/feed");
          return;
        }
      } catch (error) {
        if (isSessionGateError(error)) {
          await clearSession();
          router.replace("/(auth)/login");
          return;
        }
        const cached = !isConnected ? await cachedProfileStatus(session.user.id) : null;
        if (!isConnected && cached?.status === "complete") {
          router.replace("/(app)/feed");
          return;
        }
      }
      setGateState("ready");
      return;
    }

    try {
      const status = await fetchProfileStatus(session.tokens.accessToken);
      if (status.status === "required") {
        router.replace("/(app)/onboarding");
        return;
      }
      setGateState("ready");
      void registerForPushAsync().catch(() => undefined);
    } catch (error) {
      if (isSessionGateError(error)) {
        await clearSession();
        router.replace("/(auth)/login");
        return;
      }
      setGateState("error");
    }
  }, [isConnected, pathname]);

  useEffect(() => {
    void verifyGate();
  }, [verifyGate]);

  const unsubscribeRef = useRef<(() => void) | undefined>(undefined);

  useEffect(() => {
    if (!isConnected || gateState !== "ready" || pathname.includes("/onboarding")) {
      // Clean up if we're disconnecting or not ready
      unsubscribeRef.current?.();
      unsubscribeRef.current = undefined;
      return;
    }

    void (async () => {
      let token = await getAccessToken();
      if (!token) return;

      try {
        const out = await apiFetch("/notifications/unread-count", UnreadCountEnvelope, { token });
        setNotificationBadge(out.count);
        token = (await getAccessToken()) ?? token;
      } catch {
        token = await getAccessToken();
        if (!token) return;
      }

      // Clean up any existing subscription first
      unsubscribeRef.current?.();

      // Set up new subscription
      unsubscribeRef.current = subscribeSse({
        path: "/notifications/stream",
        token,
        schema: WsNotificationEvent,
        onEvent: (event) => {
          if (event.type === "notification.unread-count") {
            setNotificationBadge(event.payload.count);
          } else if (event.type === "notification.new") {
            setNotificationBadge((count) => count + 1);
          } else if (event.type === "notification.read") {
            setNotificationBadge(0);
          }
        },
      });
    })();

    // Cleanup function for when component unmounts or dependencies change
    return () => {
      unsubscribeRef.current?.();
      unsubscribeRef.current = undefined;
    };
  }, [gateState, isConnected, pathname]);

  if (gateState === "checking") {
    return (
      <LoadingIntro
        compact
        testID="app-gate-loading"
        label={t("appGate.loadingTitle")}
        caption={t("appGate.loadingBody")}
      />
    );
  }

  if (gateState === "error") {
    return <AppGateError isConnected={isConnected} onRetry={() => void verifyGate()} />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: nativeTokens.color.brand700,
        tabBarInactiveTintColor: nativeTokens.color.inkMuted,
        tabBarStyle: {
          height: nativeTokens.chrome.tabHeight + Math.max(insets.bottom, nativeTokens.space[2]),
          paddingTop: nativeTokens.space[2],
          paddingBottom: Math.max(insets.bottom, nativeTokens.space[2]),
          backgroundColor: nativeTokens.color.surface,
          borderTopColor: nativeTokens.color.lineSoft,
          borderTopWidth: 1,
        },
        tabBarItemStyle: {
          flex: 1,
          minWidth: 0,
          paddingTop: nativeTokens.space[1],
        },
        tabBarLabelStyle: {
          fontSize: nativeTokens.type.scale.caption.size,
          fontWeight: "700",
          fontFamily: nativeTokens.type.family.sans,
          width: nativeTokens.space[16],
          maxWidth: nativeTokens.space[16],
          textAlign: "center",
          includeFontPadding: false,
        },
      }}
    >
      <Tabs.Screen
        name="feed"
        options={{
          title: t("feed.title"),
          tabBarLabel: (props) => <TabLabel {...props} label={t("feed.title")} />,
          tabBarButton: (props) => <TabButton {...props} testID="tab-feed" />,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="home" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="network"
        options={{
          title: t("network.title"),
          tabBarLabel: (props) => <TabLabel {...props} label={t("network.title")} />,
          tabBarButton: (props) => <TabButton {...props} testID="tab-network" />,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="users" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages/index"
        options={{
          title: t("messaging.title"),
          tabBarLabel: (props) => <TabLabel {...props} label={t("messaging.title")} />,
          tabBarButton: (props) => <TabButton {...props} testID="tab-messages" />,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="message" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: t("notifications.title"),
          tabBarLabel: (props) => <TabLabel {...props} label={t("notifications.title")} />,
          tabBarButton: (props) => <TabButton {...props} testID="tab-notifications" />,
          tabBarBadge:
            notificationBadge > 0
              ? notificationBadge > 99
                ? "99+"
                : notificationBadge
              : undefined,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="bell" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="me/index"
        options={{
          title: t("nav.profile"),
          tabBarLabel: (props) => <TabLabel {...props} label={t("nav.profile")} />,
          tabBarButton: (props) => <TabButton {...props} testID="tab-me" />,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="user" color={color} focused={focused} />
          ),
        }}
      />

      <Tabs.Screen name="onboarding" options={hiddenFullScreenTabOptions} />
      <Tabs.Screen name="activity" options={hiddenTabOptions} />
      <Tabs.Screen name="jobs/index" options={hiddenTabOptions} />
      <Tabs.Screen name="composer" options={hiddenTabOptions} />
      <Tabs.Screen name="search" options={hiddenTabOptions} />
      <Tabs.Screen name="me/karama/index" options={hiddenTabOptions} />
      <Tabs.Screen name="me/edit" options={hiddenTabOptions} />
      <Tabs.Screen name="settings/index" options={hiddenTabOptions} />
      <Tabs.Screen name="settings/account" options={hiddenTabOptions} />
      <Tabs.Screen name="settings/blocked" options={hiddenTabOptions} />
      <Tabs.Screen name="settings/notifications" options={hiddenTabOptions} />
      <Tabs.Screen name="settings/privacy" options={hiddenTabOptions} />
      <Tabs.Screen name="settings/security" options={hiddenTabOptions} />
      <Tabs.Screen name="in/[handle]" options={hiddenTabOptions} />
      <Tabs.Screen name="jobs/[id]" options={hiddenTabOptions} />
      <Tabs.Screen name="employer/index" options={hiddenTabOptions} />
      <Tabs.Screen name="employer/[slug]/index" options={hiddenTabOptions} />
      <Tabs.Screen name="employer/[slug]/[jobId]" options={hiddenTabOptions} />
      <Tabs.Screen name="messages/new" options={hiddenTabOptions} />
      <Tabs.Screen name="messages/[roomId]" options={hiddenFullScreenTabOptions} />
    </Tabs>
  );
}

function isSessionGateError(error: unknown): boolean {
  if (!(error instanceof ApiRequestError)) return false;
  return (
    error.status === 401 ||
    error.code === "AUTH_UNAUTHORIZED" ||
    error.code === "AUTH_TOKEN_EXPIRED" ||
    error.code === "AUTH_TOKEN_INVALID"
  );
}
