// Bottom-tab AppShell for the authenticated app. Five visible entries per the
// mobile design docs: feed, network, raised composer action, messages, profile.
// Jobs, search, notifications, detail routes, onboarding, and edit screens stay
// pushable hidden routes so primary navigation stays focused and touch-safe.

import { WsNotificationEvent } from "@baydar/shared";
import { Button, Icon, Surface, type IconName, nativeTokens } from "@baydar/ui-native";
import type { BottomTabBarButtonProps } from "@react-navigation/bottom-tabs";
import { Tabs, router, usePathname } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { z } from "zod";

import { LoadingIntro } from "@/components/LoadingIntro";
import { apiFetch, ApiRequestError } from "@/lib/api";
import { cachedProfileStatus, fetchProfileStatus } from "@/lib/profile-state";
import { registerForPushAsync } from "@/lib/push";
import { clearSession, getAccessToken, readSession } from "@/lib/session";
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
        name="composer"
        options={{
          title: t("nav.compose"),
          tabBarLabel: (props) => <TabLabel {...props} label={t("nav.compose")} raised />,
          tabBarButton: (props) => <ComposerTabButton {...props} label={t("nav.compose")} />,
          tabBarIcon: ({ focused }) => <ComposerIcon focused={focused} />,
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

      <Tabs.Screen name="onboarding" options={{ href: null, tabBarStyle: { display: "none" } }} />
      <Tabs.Screen name="jobs/index" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen
        name="search"
        options={{
          href: null,
          tabBarBadge:
            notificationBadge > 0
              ? notificationBadge > 99
                ? "99+"
                : notificationBadge
              : undefined,
        }}
      />
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

function isSessionGateError(error: unknown): boolean {
  if (!(error instanceof ApiRequestError)) return false;
  return (
    error.status === 401 ||
    error.code === "AUTH_UNAUTHORIZED" ||
    error.code === "AUTH_TOKEN_EXPIRED" ||
    error.code === "AUTH_TOKEN_INVALID"
  );
}

function TabLabel({
  label,
  color,
  focused,
  raised = false,
}: {
  label: string;
  color: string;
  focused: boolean;
  raised?: boolean;
}): JSX.Element {
  return (
    <Text
      allowFontScaling={false}
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.72}
      style={{
        width: nativeTokens.space[16],
        maxWidth: nativeTokens.space[16],
        color,
        fontFamily: nativeTokens.type.family.sans,
        fontSize: nativeTokens.type.scale.caption.size - nativeTokens.space[1] / 2,
        lineHeight: nativeTokens.type.scale.caption.line - nativeTokens.space[1],
        fontWeight: focused ? "800" : "700",
        textAlign: "center",
        includeFontPadding: false,
        marginTop: raised ? nativeTokens.space[1] : 0,
      }}
    >
      {label}
    </Text>
  );
}

function TabButton({
  testID,
  ...props
}: BottomTabBarButtonProps & { testID: string }): JSX.Element {
  const { ref: _ref, ...pressableProps } = props as BottomTabBarButtonProps & { ref?: unknown };
  return <Pressable {...pressableProps} testID={testID} />;
}

function ComposerTabButton({
  label,
  ...props
}: BottomTabBarButtonProps & { label: string }): JSX.Element {
  const { ref: _ref, ...pressableProps } = props as BottomTabBarButtonProps & { ref?: unknown };
  return (
    <Pressable
      {...pressableProps}
      testID="tab-composer"
      accessibilityLabel={label}
      style={[
        pressableProps.style,
        {
          top: -nativeTokens.space[2],
          alignItems: "center",
          justifyContent: "center",
        },
      ]}
    />
  );
}

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
        minWidth: nativeTokens.chrome.minHit,
        height: nativeTokens.space[6] + nativeTokens.space[1],
        borderRadius: nativeTokens.radius.full,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: focused ? nativeTokens.color.brand50 : "transparent",
      }}
    >
      <Icon
        name={name}
        color={color}
        size={nativeTokens.space[5]}
        strokeWidth={focused ? 2.2 : 1.8}
      />
    </View>
  );
}

function ComposerIcon({ focused }: { focused: boolean }): JSX.Element {
  return (
    <View
      style={{
        width: nativeTokens.space[12] + nativeTokens.space[1],
        height: nativeTokens.space[12] + nativeTokens.space[1],
        borderRadius: nativeTokens.radius.full,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: focused ? nativeTokens.color.brand700 : nativeTokens.color.brand600,
        borderWidth: nativeTokens.space[1],
        borderColor: nativeTokens.color.surface,
        ...nativeTokens.shadow.card,
      }}
    >
      <Icon
        name="plus"
        color={nativeTokens.color.inkInverse}
        size={nativeTokens.space[6]}
        strokeWidth={2.4}
      />
    </View>
  );
}
