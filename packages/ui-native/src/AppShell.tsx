// AppShell — the sticky chrome wrapping every authenticated mobile route.
// Spec: docs/components/AppShell.md.
// Adapted from docs/_archive/prototype-2025/components/AppShell.jsx for React Native.
// Web twin: packages/ui-web/src/AppShell.tsx.

import { type ReactElement, type ReactNode } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

import { Avatar, type AvatarUser } from "./Avatar";
import { Icon, type IconName } from "./Icon";
import { useThemeTokens } from "./ThemeProvider";
import { nativeTokens } from "./tokens";

export type AppShellRoute =
  | "feed"
  | "network"
  | "jobs"
  | "messages"
  | "notifications"
  | "profile"
  | "saved"
  | "employer";

export interface AppShellLabels {
  /** Alt text for the logo button (announced to screen readers). */
  logoAlt: string;
  /** Placeholder for the search pill. */
  searchPlaceholder: string;
  /** aria-label for the search input itself. */
  searchLabel: string;
  /** Top nav labels, Arabic-first. */
  nav: Record<Exclude<AppShellRoute, "profile">, string>;
  /** aria-label for the <nav> landmark wrapping the top nav. */
  mainNavLabel: string;
  /** Profile menu. */
  myProfile: string;
  viewProfile: string;
  settings: string;
  signOut: string;
  /**
   * Screen-reader template for unread badges. `{count}` is replaced with the
   * formatted number (e.g. "3 رسائل غير مقروءة"). Keep it short.
   */
  unreadTemplate: Record<Exclude<AppShellRoute, "profile" | "feed" | "network" | "jobs">, string>;
  /** Tooltip/screen-reader text when the notifications SSE stream disconnects. */
  bellDisconnected: string;
}

export interface AppShellProps {
  /**
   * Render children with no chrome (header, search, nav, profile menu).
   * Used by onboarding / auth flows that ratify the bare shell per
   * DESIGN.md §11.1. When true, all other shell props are ignored.
   */
  bare?: boolean;
  /** Current pathname (already mapped to a route key by the host). */
  currentRoute: AppShellRoute | null;
  /** Signed-in user used for the profile avatar. Null during hydration. */
  me: AvatarUser | null;
  /** Optional profile headline rendered in the menu hero. */
  meHeadline?: string | null;
  /** i18n strings — required so AppShell never ships hardcoded Arabic/English. */
  labels: AppShellLabels;

  /** Fired when any nav item is activated (click, Enter, Space). */
  onNavigate(route: AppShellRoute): void;

  /** Route group to highlight "my profile" when on /me or /in/{myHandle}. */
  children: ReactNode;
}

export function AppShell({
  bare = false,
  currentRoute,
  me,
  labels,
  onNavigate,
  children,
}: AppShellProps): ReactElement {
  const c = useThemeTokens().color;
  if (bare) {
    return <View style={styles.bare}>{children}</View>;
  }

  return (
    <View style={[styles.container, { backgroundColor: c.surface }]}>
      {/* Header */}
      <View style={[styles.header, { borderColor: c.lineSoft }]}>
        {/* Logo — routes home. */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => onNavigate("feed")}
          accessibilityLabel={labels.logoAlt}
          style={styles.logoButton}
        >
          <Icon name="logo" size={32} />
          {!labels.logoAlt || labels.logoAlt.length === 0 ? null : (
            <Text style={[styles.logoText, { color: c.ink }]}>{labels.logoAlt}</Text>
          )}
        </TouchableOpacity>

        {/* Search pill. */}
        <View style={[styles.searchInputContainer, { backgroundColor: c.surfaceSubtle }]}>
          <Icon name="search" size={16} color={c.ink} />
          {/* TODO: Replace with actual TextInput when search is implemented */}
          <View style={{ flex: 1 }} />
        </View>

        {/* Right cluster: nav + divider + profile. */}
        <View style={styles.navContainer}>
          {/* Nav items */}
          <View style={styles.navItems}>
            {[
              { key: "feed" as AppShellRoute, icon: "home" as IconName },
              { key: "network" as AppShellRoute, icon: "users" as IconName },
              { key: "jobs" as AppShellRoute, icon: "briefcase" as IconName },
              { key: "messages" as AppShellRoute, icon: "message" as IconName },
              { key: "notifications" as AppShellRoute, icon: "bell" as IconName },
              { key: "saved" as AppShellRoute, icon: "bookmark" as IconName },
              { key: "employer" as AppShellRoute, icon: "building" as IconName },
            ].map((item) => {
              const active = currentRoute === item.key;
              return (
                <TouchableOpacity
                  key={item.key}
                  activeOpacity={0.7}
                  onPress={() => onNavigate(item.key)}
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={
                    active
                      ? `${labels.nav[item.key as Exclude<AppShellRoute, "profile">]}, ${labels.myProfile}`
                      : labels.nav[item.key as Exclude<AppShellRoute, "profile">]
                  }
                  style={[
                    styles.navItem,
                    active ? { borderBottomWidth: 2, borderColor: c.brand600 } : null,
                  ]}
                >
                  <View style={styles.navIcon}>
                    <Icon name={item.icon} size={20} color={c.ink} />
                  </View>
                  <Text style={[styles.navText, { color: c.ink }]}>
                    {labels.nav[item.key as Exclude<AppShellRoute, "profile">]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Vertical divider. */}
          <View style={[styles.divider, { backgroundColor: c.lineSoft }]} />

          {/* Profile menu trigger. */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              // TODO: Implement profile menu
              // onViewProfile?.();
            }}
            accessibilityLabel={labels.myProfile}
            style={styles.profileButton}
          >
            {me ? (
              <Avatar user={me} size="sm" />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: c.surfaceSunken }]} />
            )}
            <Text style={[styles.profileText, { color: c.ink }]}>{labels.myProfile}</Text>
            <Icon name="chevron-down" size={12} color={c.ink} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: nativeTokens.color.surface,
  },
  bare: {
    flex: 1,
  },
  header: {
    height: 56, // h-14 equivalent
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: nativeTokens.color.lineSoft,
  },
  logoButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoText: {
    marginLeft: 8,
    fontSize: 18,
    fontWeight: "600",
  },
  searchInputContainer: {
    flex: 1,
    marginHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: nativeTokens.color.surfaceSubtle,
    borderRadius: 20,
    paddingHorizontal: 12,
    height: 36,
  },
  searchIcon: {
    marginRight: 8,
    color: nativeTokens.color.inkMuted,
  },
  navContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  navItems: {
    flexDirection: "row",
  },
  navItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  navItemActive: {
    borderBottomWidth: 2,
    borderColor: nativeTokens.color.brand600, // brand-600 token
  },
  navIcon: {
    marginRight: 4,
  },
  navText: {
    fontSize: 11,
    fontWeight: "500",
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: nativeTokens.color.lineSoft,
    marginHorizontal: 12,
  },
  profileButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    backgroundColor: nativeTokens.color.surfaceSunken,
    borderRadius: 16,
  },
  profileText: {
    marginLeft: 8,
    fontSize: 11,
    fontWeight: "500",
  },
  chevron: {
    marginLeft: 4,
  },
  content: {
    flex: 1,
  },
});
