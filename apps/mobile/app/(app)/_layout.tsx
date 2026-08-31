// Bottom-tab AppShell for the authenticated app. Five visible entries per the
// Sprint 21 mobile decision: feed, network, messages, notifications, profile.
// Jobs, search, composer, detail routes, onboarding, and edit screens stay
// pushable hidden routes so primary navigation stays focused and touch-safe.

import { WsNotificationEvent, formatNumber } from "@baydar/shared";
import { nativeTokens, useThemeTokens } from "@baydar/ui-native";
import { Tabs, router, usePathname } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { BackHandler } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { z } from "zod";

import { LoadingIntro } from "@/components/LoadingIntro";
import { apiFetch, ApiRequestError } from "@/lib/api";
import { nextNotificationBadge } from "@/lib/notification-badge";
import { cachedProfileStatus, fetchProfileStatus } from "@/lib/profile-state";
import { registerForPushAsync } from "@/lib/push";
import { clearSession, readSession } from "@/lib/session";
import { subscribeSse } from "@/lib/sse";
import {
  HIDDEN_APP_TAB_ROUTES,
  HIDDEN_FULL_SCREEN_APP_TAB_ROUTES,
} from "@/navigation/app-tab-routes";
import { useNetworkStore } from "@/store/network";

import { AppGateError } from "@/screens/tabs/AppGateError";
import {
  TabButton,
  TabIcon,
  TabLabel,
  hiddenFullScreenTabOptions,
  hiddenTabOptions,
} from "@/screens/tabs/TabParts";

const UnreadCountEnvelope = z.object({ count: z.number().int().nonnegative() });

export default function AppTabsLayout(): JSX.Element {
  const { t, i18n } = useTranslation();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const tk = useThemeTokens();
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

  useEffect(() => {
    if (pathname !== "/feed") return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      BackHandler.exitApp();
      return true;
    });
    return () => subscription.remove();
  }, [pathname]);

  const unsubscribeRef = useRef<(() => void) | undefined>(undefined);

  const refreshBadge = useCallback(async (): Promise<void> => {
    try {
      const out = await apiFetch("/notifications/unread-count", UnreadCountEnvelope);
      setNotificationBadge(out.count);
    } catch {
      // A stale badge is better than a crashed shell; the next event or the
      // next reconnect corrects it.
    }
  }, []);

  useEffect(() => {
    if (!isConnected || gateState !== "ready" || pathname.includes("/onboarding")) {
      // Clean up if we're disconnecting or not ready
      unsubscribeRef.current?.();
      unsubscribeRef.current = undefined;
      return;
    }

    void refreshBadge();

    // Clean up any existing subscription first
    unsubscribeRef.current?.();

    // `subscribeSse` owns reconnection and mints a fresh stream token per
    // attempt, so a drop no longer kills the badge until this effect happens to
    // re-run. No token is threaded in: the mint resolves one per attempt, which
    // is the whole point — a captured 15-minute access token is exactly what
    // made the first reconnect after a long background 401.
    unsubscribeRef.current = subscribeSse({
      scope: "notifications",
      schema: WsNotificationEvent,
      onEvent: (event) => {
        setNotificationBadge((count) => nextNotificationBadge(count, event));
      },
      // Events that fired while the stream was down are gone, so the count is
      // only trustworthy after a fresh read. Same reasoning as web's rooms
      // refetch in apps/web/src/app/[locale]/(app)/layout.tsx.
      onOpen: () => void refreshBadge(),
      // No token could be minted at all — the session is probably gone. Let the
      // gate decide whether that means a redirect to login.
      onFailed: () => void verifyGate(),
    });

    // Cleanup function for when component unmounts or dependencies change
    return () => {
      unsubscribeRef.current?.();
      unsubscribeRef.current = undefined;
    };
  }, [gateState, isConnected, pathname, refreshBadge, verifyGate]);

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
      backBehavior="history"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: tk.color.brand700,
        tabBarInactiveTintColor: tk.color.inkMuted,
        tabBarStyle: {
          height: nativeTokens.chrome.tabHeight + Math.max(insets.bottom, nativeTokens.space[2]),
          paddingTop: nativeTokens.space[2],
          paddingBottom: Math.max(insets.bottom, nativeTokens.space[2]),
          backgroundColor: tk.color.surface,
          borderTopColor: tk.color.lineSoft,
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
                ? `${formatNumber(99, i18n.language)}+`
                : formatNumber(notificationBadge, i18n.language)
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

      {HIDDEN_APP_TAB_ROUTES.map((name) => (
        <Tabs.Screen key={name} name={name} options={hiddenTabOptions} />
      ))}
      {HIDDEN_FULL_SCREEN_APP_TAB_ROUTES.map((name) => (
        <Tabs.Screen key={name} name={name} options={hiddenFullScreenTabOptions} />
      ))}
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
