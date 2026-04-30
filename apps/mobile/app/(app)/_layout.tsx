// Bottom-tab AppShell for the authenticated app. Six visible tabs:
// feed · network · jobs · messages · notifications · search. Everything else
// (composer, onboarding, profile-edit, public profile, room detail) still
// lives under this route group but renders `href: null` so it doesn't appear
// in the tab bar — those screens are pushed via router.push().
//
// Tab glyphs come from ui-native Icon — same 24×24 stroke set as the web
// header on /feed, so the two platforms stay visually locked in step.

import { WsNotificationEvent } from "@baydar/shared";
import { Tabs, router, usePathname } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { z } from "zod";

import { Button, Icon, Surface, type IconName, nativeTokens } from "@baydar/ui-native";
import { LoadingIntro } from "@/components/LoadingIntro";
import { apiFetch } from "@/lib/api";
import { cachedProfileStatus, fetchProfileStatus } from "@/lib/profile-state";
import { registerForPushAsync } from "@/lib/push";
import { getAccessToken, readSession } from "@/lib/session";
import { subscribeSse } from "@/lib/sse";
import { useNetworkStore } from "@/store/network";

const UnreadCountEnvelope = z.object({ count: z.number().int().nonnegative() });

export default function AppTabsLayout(): JSX.Element {
  const { t } = useTranslation();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const isConnected = useNetworkStore((state) => state.isConnected);
  const [notificationBadge, setNotificationBadge] = useState<number>(0);
  const [gateState, setGateState] = useState<"checking" | "ready" | "error">("checking");

  const verifyGate = useCallback(async (): Promise<void> => {
    setGateState("checking");
    const session = await readSession();
    if (!session) {
      router.replace("/(auth)/login");
      return;
    }

    const isOnboardingRoute = pathname.includes("/onboarding");
    const cached = await cachedProfileStatus(session.user.id);

    if (isOnboardingRoute) {
      try {
        const status = await fetchProfileStatus(session.tokens.accessToken);
        if (status.status === "complete") {
          router.replace("/(app)/feed");
          return;
        }
      } catch {
        if (cached?.status === "complete") {
          router.replace("/(app)/feed");
          return;
        }
      }
      setGateState("ready");
      return;
    }

    if (cached?.status === "complete") {
      setGateState("ready");
      void registerForPushAsync().catch(() => undefined);
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
    } catch {
      setGateState("error");
    }
  }, [pathname]);

  useEffect(() => {
    void verifyGate();
  }, [verifyGate]);

  useEffect(() => {
    if (!isConnected || gateState !== "ready" || pathname.includes("/onboarding")) return;
    let unsubscribe: (() => void) | undefined;
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
        /* keep tab shell usable */
      }
      unsubscribe = subscribeSse({
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
    return (): void => {
      unsubscribe?.();
    };
  }, [gateState, isConnected, pathname]);

  if (gateState === "checking") {
    return <LoadingIntro compact testID="app-gate-loading" />;
  }

  if (gateState === "error") {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: nativeTokens.color.surfaceMuted }}>
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            padding: nativeTokens.space[4],
          }}
        >
          <Surface variant="hero" padding="5" style={{ gap: nativeTokens.space[3] }}>
            <Text
              selectable
              style={{
                color: nativeTokens.color.ink,
                fontFamily: nativeTokens.type.family.sans,
                fontSize: nativeTokens.type.scale.h1.size,
                fontWeight: "700",
                lineHeight: nativeTokens.type.scale.h1.line,
                textAlign: "right",
              }}
            >
              {t("appGate.title")}
            </Text>
            <Text
              selectable
              style={{
                color: nativeTokens.color.inkMuted,
                fontFamily: nativeTokens.type.family.body,
                fontSize: nativeTokens.type.scale.body.size,
                lineHeight: nativeTokens.type.scale.body.line,
                textAlign: "right",
              }}
            >
              {isConnected ? t("appGate.body") : t("appGate.offlineBody")}
            </Text>
            <Button
              fullWidth
              size="lg"
              accessibilityLabel={t("common.retry")}
              onPress={() => void verifyGate()}
            >
              {t("common.retry")}
            </Button>
          </Surface>
        </View>
      </SafeAreaView>
    );
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
          paddingTop: nativeTokens.space[1],
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700",
          fontFamily: nativeTokens.type.family.sans,
        },
      }}
    >
      <Tabs.Screen
        name="feed"
        options={{
          title: t("feed.title"),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="home" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="network"
        options={{
          title: t("network.title"),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="users" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="jobs/index"
        options={{
          title: t("jobs.title"),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="briefcase" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages/index"
        options={{
          title: t("messaging.title"),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="message" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: t("notifications.title"),
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
        name="search"
        options={{
          title: t("search.title"),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="search" color={color} focused={focused} />
          ),
        }}
      />

      {/* Routes that exist inside (app) but shouldn't have a tab. Setting
         href: null hides them from the tab bar while keeping them pushable. */}
      <Tabs.Screen name="composer" options={{ href: null }} />
      <Tabs.Screen name="onboarding" options={{ href: null, tabBarStyle: { display: "none" } }} />
      <Tabs.Screen name="me/edit" options={{ href: null }} />
      <Tabs.Screen name="in/[handle]" options={{ href: null }} />
      <Tabs.Screen name="jobs/[id]" options={{ href: null }} />
      <Tabs.Screen name="messages/new" options={{ href: null }} />
      <Tabs.Screen
        name="messages/[roomId]"
        options={{ href: null, tabBarStyle: { display: "none" } }}
      />
    </Tabs>
  );
}

// Tab icons: bump stroke-width a touch when focused so the active tab reads
// bolder without needing a separate filled glyph set.
function TabIcon({
  name,
  color,
  focused,
}: {
  name: IconName;
  color: string;
  focused: boolean;
}): JSX.Element {
  return (
    <View
      style={{
        minWidth: 42,
        height: 28,
        borderRadius: nativeTokens.radius.full,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: focused ? nativeTokens.color.brand50 : "transparent",
      }}
    >
      <Icon name={name} color={color} size={22} strokeWidth={focused ? 2.2 : 1.8} />
    </View>
  );
}
