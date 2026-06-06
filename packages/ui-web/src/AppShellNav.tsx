"use client";

import { type KeyboardEvent, type RefObject } from "react";

import { NAV_ITEMS, formatBadge } from "./AppShell.constants";
import { AppShellProfileMenu } from "./AppShellProfileMenu";
import { cx } from "./cx";
import { Icon } from "./Icon";
import type { AppShellLabels, AppShellRoute } from "./AppShell.types";
import type { AvatarUser } from "./Avatar";

interface AppShellNavProps {
  navRef: RefObject<HTMLElement | null>;
  currentRoute: AppShellRoute | null;
  labels: AppShellLabels;
  messagesUnread?: number;
  notificationsUnread?: number;
  notificationsConnectionDropped: boolean;
  me: AvatarUser | null;
  meHeadline?: string | null;
  menuOpen: boolean;
  onMenuOpenChange(open: boolean): void;
  onNavigate(route: AppShellRoute): void;
  onViewProfile?(): void;
  onOpenSettings?(): void;
  onSignOut?(): void;
}

export function AppShellNav({
  navRef,
  currentRoute,
  labels,
  messagesUnread,
  notificationsUnread,
  notificationsConnectionDropped,
  me,
  meHeadline,
  menuOpen,
  onMenuOpenChange,
  onNavigate,
  onViewProfile,
  onOpenSettings,
  onSignOut,
}: AppShellNavProps): JSX.Element {
  function onNavKeyDown(e: KeyboardEvent<HTMLElement>): void {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight" && e.key !== "Home" && e.key !== "End") {
      return;
    }
    const nav = navRef.current;
    if (!nav) return;
    const focusables = Array.from(
      nav.querySelectorAll<HTMLButtonElement>("button[data-nav-item], button[data-nav-profile]"),
    );
    const idx = focusables.indexOf(document.activeElement as HTMLButtonElement);
    if (idx === -1) return;
    e.preventDefault();

    if (e.key === "Home") return focusables[0]?.focus();
    if (e.key === "End") return focusables[focusables.length - 1]?.focus();

    const isRtl = document.documentElement.getAttribute("dir") === "rtl";
    const visualNext = isRtl ? e.key === "ArrowLeft" : e.key === "ArrowRight";
    const step = visualNext ? 1 : -1;
    focusables[(idx + step + focusables.length) % focusables.length]?.focus();
  }

  return (
    <nav
      ref={navRef}
      onKeyDown={onNavKeyDown}
      aria-label={labels.mainNavLabel}
      className="flex min-w-0 shrink items-stretch gap-1 overflow-x-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {NAV_ITEMS.map((item) => (
        <NavButton
          key={item.key}
          route={item.key}
          currentRoute={currentRoute}
          labels={labels}
          messagesUnread={messagesUnread}
          notificationsUnread={notificationsUnread}
          notificationsConnectionDropped={notificationsConnectionDropped}
          onNavigate={onNavigate}
        />
      ))}

      <div aria-hidden="true" className="bg-line-soft mx-2 my-2 w-px" />

      <AppShellProfileMenu
        active={currentRoute === "profile"}
        me={me}
        meHeadline={meHeadline}
        labels={labels}
        open={menuOpen}
        onOpenChange={onMenuOpenChange}
        onViewProfile={onViewProfile}
        onOpenSettings={onOpenSettings}
        onSignOut={onSignOut}
      />
    </nav>
  );
}

function NavButton({
  route,
  currentRoute,
  labels,
  messagesUnread,
  notificationsUnread,
  notificationsConnectionDropped,
  onNavigate,
}: {
  route: Exclude<AppShellRoute, "profile">;
  currentRoute: AppShellRoute | null;
  labels: AppShellLabels;
  messagesUnread?: number;
  notificationsUnread?: number;
  notificationsConnectionDropped: boolean;
  onNavigate(route: AppShellRoute): void;
}): JSX.Element {
  const item = NAV_ITEMS.find((navItem) => navItem.key === route)!;
  const active = currentRoute === route;
  const count = route === "messages" ? messagesUnread : route === "notifications" ? notificationsUnread : undefined;
  const badgeText = typeof count === "number" ? formatBadge(count) : "";
  const srUnread =
    typeof count === "number" && count > 0
      ? unreadLabelFor(labels, route, count)
      : undefined;
  const disconnected = route === "notifications" && notificationsConnectionDropped;

  return (
    <button
      type="button"
      data-nav-item
      onClick={() => onNavigate(route)}
      aria-current={active ? "page" : undefined}
      title={disconnected ? labels.bellDisconnected : undefined}
      className={cx(
        "relative -mb-px inline-flex min-w-[64px] flex-col items-center gap-0.5 border-b-2 px-3 py-2 text-[11px] font-medium focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]",
        active ? "border-brand-600 text-ink" : "text-ink-muted hover:text-ink border-transparent",
      )}
    >
      <span className="relative">
        <Icon name={item.icon} size={20} />
        {badgeText ? (
          <span
            aria-hidden="true"
            className="bg-accent-600 text-ink-inverse absolute -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none ltr:-end-1.5 rtl:-start-1.5"
          >
            {badgeText}
          </span>
        ) : null}
        {disconnected ? (
          <span className="ring-surface absolute -bottom-0.5 h-2 w-2 rounded-full bg-[var(--warning-soft)] ring-2 ltr:-end-1 rtl:-start-1" />
        ) : null}
        {srUnread ? <span className="sr-only">{srUnread}</span> : null}
        {disconnected ? <span className="sr-only">{labels.bellDisconnected}</span> : null}
      </span>
      <span>{labels.nav[route]}</span>
    </button>
  );
}

function unreadLabelFor(
  labels: AppShellLabels,
  route: Exclude<AppShellRoute, "profile">,
  count: number,
): string | undefined {
  if (route !== "messages" && route !== "notifications") return undefined;
  return labels.unreadTemplate[route]?.replace("{count}", String(count));
}
