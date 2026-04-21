// Bottom-tab AppShell for the authenticated app. Six visible tabs:
// feed · network · jobs · messages · notifications · search. Everything else
// (composer, onboarding, profile-edit, public profile, room detail) still
// lives under this route group but renders `href: null` so it doesn't appear
// in the tab bar — those screens are pushed via router.push().
//
// Tab glyphs come from ui-native Icon — same 24×24 stroke set as the web
// header on /feed, so the two platforms stay visually locked in step.

import { Tabs, router } from "expo-router";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Platform } from "react-native";

import { Icon, type IconName, nativeTokens } from "@palnet/ui-native";
import { readSession } from "@/lib/session";

export default function AppTabsLayout(): JSX.Element {
  const { t } = useTranslation();

  // Gate the whole authenticated area on having a session. If missing, bounce
  // back to the landing page which itself redirects to /login.
  useEffect(() => {
    void (async () => {
      const session = await readSession();
      if (!session) router.replace("/(auth)/login");
    })();
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: nativeTokens.color.brand700,
        tabBarInactiveTintColor: nativeTokens.color.inkMuted,
        tabBarStyle: {
          height: nativeTokens.chrome.tabHeight + (Platform.OS === "ios" ? 20 : 0),
          paddingTop: nativeTokens.space[1],
          paddingBottom: Platform.OS === "ios" ? nativeTokens.space[4] : nativeTokens.space[2],
          backgroundColor: nativeTokens.color.surface,
          borderTopColor: nativeTokens.color.lineSoft,
        },
        tabBarLabelStyle: {
          fontSize: 11,
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
        name="jobs"
        options={{
          title: t("jobs.title"),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="briefcase" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
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
      <Tabs.Screen name="onboarding" options={{ href: null }} />
      <Tabs.Screen name="me/edit" options={{ href: null }} />
      <Tabs.Screen name="in/[handle]" options={{ href: null }} />
      <Tabs.Screen name="jobs/[id]" options={{ href: null }} />
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
  return <Icon name={name} color={color} size={22} strokeWidth={focused ? 2.2 : 1.8} />;
}
