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

// Annotated, not cast — `as IconName` here would silently accept a glyph the
// Icon switch has no case for, which renders nothing. Web twin: AppShell.constants.ts.
const NAV_ITEMS: ReadonlyArray<{
  key: Exclude<AppShellRoute, "profile">;
  icon: IconName;
}> = [
  { key: "feed", icon: "home" },
  { key: "network", icon: "users" },
  { key: "jobs", icon: "briefcase" },
  { key: "messages", icon: "message" },
  { key: "notifications", icon: "bell" },
  { key: "saved", icon: "bookmark" },
  { key: "employer", icon: "building" },
];

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

  /**
   * Fired when the search pill is pressed. On native the pill is a button
   * that hands off to the host's search screen (MOBILE.md override of the
   * web inline input); the host owns navigation.
   */
  onSearchPress?(): void;

  /** Fired when the profile trigger is pressed. The host owns the menu/route. */
  onViewProfile?(): void;

  /** Route group to highlight "my profile" when on /me or /in/{myHandle}. */
  /**
   * Rendered in the header, before the nav. The kit stays framework-neutral
   * and store-free; the app decides what belongs in its chrome. Same prop as
   * the web twin.
   */
  headerSlot?: ReactNode;
  children: ReactNode;
}

export function AppShell({
  bare = false,
  currentRoute,
  me,
  labels,
  onNavigate,
  onSearchPress,
  onViewProfile,
  children,
  headerSlot,
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

        {headerSlot}

        {/* Search pill — a button that hands off to the host's search screen. */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onSearchPress}
          accessibilityRole="button"
          accessibilityLabel={labels.searchLabel}
          style={[styles.searchInputContainer, { backgroundColor: c.surfaceSubtle }]}
        >
          <Icon name="search" size={16} color={c.ink} />
          <Text numberOfLines={1} style={[styles.searchPlaceholder, { color: c.inkMuted }]}>
            {labels.searchPlaceholder}
          </Text>
        </TouchableOpacity>

        {/* Right cluster: nav + divider + profile. */}
        <View style={styles.navContainer}>
          {/* Nav items */}
          <View style={styles.navItems}>
            {NAV_ITEMS.map((item) => {
              const active = currentRoute === item.key;
              return (
                <TouchableOpacity
                  key={item.key}
                  activeOpacity={0.7}
                  onPress={() => onNavigate(item.key)}
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={
                    active ? `${labels.nav[item.key]}, ${labels.myProfile}` : labels.nav[item.key]
                  }
                  style={[
                    styles.navItem,
                    active ? { borderBottomWidth: 2, borderColor: c.brand600 } : null,
                  ]}
                >
                  <View style={styles.navIcon}>
                    <Icon name={item.icon} size={20} color={c.ink} />
                  </View>
                  <Text style={[styles.navText, { color: c.ink }]}>{labels.nav[item.key]}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Vertical divider. */}
          <View style={[styles.divider, { backgroundColor: c.lineSoft }]} />

          {/* Profile menu trigger. */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onViewProfile}
            accessibilityRole="button"
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
  },
  bare: {
    flex: 1,
  },
  header: {
    height: nativeTokens.chrome.navHeight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: nativeTokens.space[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  logoButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoText: {
    marginStart: nativeTokens.space[2],
    fontSize: nativeTokens.type.scale.h2.size,
    fontWeight: "600",
  },
  searchInputContainer: {
    flex: 1,
    marginHorizontal: nativeTokens.space[3],
    flexDirection: "row",
    alignItems: "center",
    borderRadius: nativeTokens.radius.xl,
    paddingHorizontal: nativeTokens.space[3],
    height: nativeTokens.space[9],
  },
  searchIcon: {
    marginEnd: nativeTokens.space[2],
  },
  searchPlaceholder: {
    flex: 1,
    marginStart: nativeTokens.space[2],
    fontSize: nativeTokens.type.scale.small.size,
  },
  navContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  navItems: {
    flexDirection: "row",
  },
  navItem: {
    paddingVertical: nativeTokens.space[2],
    paddingHorizontal: nativeTokens.space[3],
  },
  navItemActive: {
    borderBottomWidth: 2,
  },
  navIcon: {
    marginEnd: nativeTokens.space[1],
  },
  navText: {
    fontSize: nativeTokens.type.scale.caption.size,
    fontWeight: "500",
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    marginHorizontal: nativeTokens.space[3],
  },
  profileButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarPlaceholder: {
    width: nativeTokens.space[8],
    height: nativeTokens.space[8],
    borderRadius: nativeTokens.radius.full,
  },
  profileText: {
    marginStart: nativeTokens.space[2],
    fontSize: nativeTokens.type.scale.caption.size,
    fontWeight: "500",
  },
  chevron: {
    marginStart: nativeTokens.space[1],
  },
  content: {
    flex: 1,
  },
});
