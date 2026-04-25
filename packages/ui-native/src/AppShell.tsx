import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { nativeTokens } from "./tokens";

export type AppShellRoute = "feed" | "network" | "jobs" | "messages" | "notifications" | "profile";

export interface AppShellLabels {
  logoAlt: string;
  searchPlaceholder: string;
  searchLabel: string;
  nav: Record<Exclude<AppShellRoute, "profile">, string>;
  mainNavLabel: string;
  myProfile: string;
  viewProfile: string;
  settings: string;
  moderation?: string;
  signOut: string;
  unreadTemplate: Record<Exclude<AppShellRoute, "profile" | "feed" | "network" | "jobs">, string>;
}

export interface AppShellProps {
  children: ReactNode;
  header?: ReactNode;
  tabBar?: ReactNode;
}

export function AppShell({ children, header, tabBar }: AppShellProps): JSX.Element {
  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      {header ? <View style={styles.header}>{header}</View> : null}
      <View style={styles.body}>{children}</View>
      {tabBar ? <View style={styles.tabBar}>{tabBar}</View> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: nativeTokens.color.surfaceMuted,
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: nativeTokens.color.lineSoft,
    backgroundColor: nativeTokens.color.surface,
  },
  body: {
    flex: 1,
  },
  tabBar: {
    borderTopWidth: 1,
    borderTopColor: nativeTokens.color.lineSoft,
    backgroundColor: nativeTokens.color.surface,
  },
});
