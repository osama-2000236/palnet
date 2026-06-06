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
  currentRoute: AppShellRoute | null;
  me: AvatarUser | null;
  meHeadline?: string | null;
  labels: AppShellLabels;
  messagesUnread?: number;
  notificationsUnread?: number;
  notificationsConnectionDropped?: boolean;
  searchValue?: string;
  onSearchChange?(next: string): void;
  onSearchSubmit?(value: string): void;
  onNavigate(route: AppShellRoute): void;
  onViewProfile?(): void;
  onOpenSettings?(): void;
  onSignOut?(): void;
  children: ReactNode;
}
