import type { ReactNode } from "react";

import type { AvatarUser } from "./Avatar";

export type AppShellRoute =
  | "feed"
  | "network"
  | "jobs"
  | "messages"
  | "notifications"
  | "activity"
  | "profile"
  | "saved"
  | "employer";

export interface AppShellLabels {
  logoAlt: string;
  /** A2.8 — "تخطي إلى المحتوى". Optional so existing hosts keep compiling. */
  skipToContent?: string;
  searchPlaceholder: string;
  searchLabel: string;
  nav: Record<Exclude<AppShellRoute, "profile">, string>;
  mainNavLabel: string;
  myProfile: string;
  viewProfile: string;
  settings: string;
  signOut: string;
  unreadTemplate: Record<Exclude<AppShellRoute, "profile" | "feed" | "network" | "jobs">, string>;
  bellDisconnected: string;
}

export interface AppShellProps {
  bare?: boolean;
  /**
   * Rendered in the header, before the nav. The kit stays framework-neutral
   * and store-free; the app decides what belongs in its chrome. Today that is
   * the bandwidth-mode chip.
   */
  headerSlot?: ReactNode;
  currentRoute: AppShellRoute | null;
  me: AvatarUser | null;
  meHeadline?: string | null;
  labels: AppShellLabels;
  messagesUnread?: number;
  notificationsUnread?: number;
  notificationsConnectionDropped?: boolean;
  /** Locale-aware number formatter for unread badges. Defaults to Latin digits. */
  formatCount?(value: number): string;
  searchValue?: string;
  onSearchChange?(next: string): void;
  onSearchSubmit?(value: string): void;
  onNavigate(route: AppShellRoute): void;
  onViewProfile?(): void;
  onOpenSettings?(): void;
  onSignOut?(): void;
  children: ReactNode;
}
