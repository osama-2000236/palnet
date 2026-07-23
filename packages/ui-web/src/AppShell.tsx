"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { AppShellNav } from "./AppShellNav";
import { AppShellSearch } from "./AppShellSearch";
import type { AppShellProps, AppShellRoute } from "./AppShell.types";
import { Icon } from "./Icon";

export type { AppShellLabels, AppShellProps, AppShellRoute } from "./AppShell.types";

export function AppShell({
  bare = false,
  currentRoute,
  me,
  meHeadline,
  labels,
  messagesUnread,
  notificationsUnread,
  notificationsConnectionDropped = false,
  formatCount = String,
  searchValue,
  onSearchChange,
  onSearchSubmit,
  onNavigate,
  onViewProfile,
  onOpenSettings,
  onSignOut,
  children,
}: AppShellProps): JSX.Element {
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const navRef = useRef<HTMLElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    function onKey(e: globalThis.KeyboardEvent): void {
      if (!(e.key === "k" || e.key === "K")) return;
      if (!(e.metaKey || e.ctrlKey)) return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      const editing = tag === "INPUT" || tag === "TEXTAREA" || (target?.isContentEditable ?? false);
      if (editing && target === searchInputRef.current) return;
      e.preventDefault();
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (bare) {
    return <ShellFrame>{children}</ShellFrame>;
  }

  return (
    <ShellFrame>
      <header role="banner" className="border-line-soft bg-surface sticky top-0 z-20 h-14 border-b">
        <div className="mx-auto flex h-full w-full min-w-0 max-w-[1128px] items-center gap-2 px-3 sm:gap-4 sm:px-5">
          <button
            type="button"
            onClick={() => onNavigate("feed")}
            aria-label={labels.logoAlt}
            className="text-ink flex shrink-0 items-center gap-2 rounded-md py-1 hover:opacity-90 focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]"
          >
            <Icon name="logo" size={32} />
            <span className="hidden text-lg font-semibold sm:inline">{labels.logoAlt}</span>
          </button>

          <AppShellSearch
            inputRef={searchInputRef}
            value={searchValue}
            placeholder={labels.searchPlaceholder}
            label={labels.searchLabel}
            onChange={onSearchChange}
            onSubmit={onSearchSubmit}
          />

          <AppShellNav
            navRef={navRef}
            currentRoute={currentRoute}
            labels={labels}
            messagesUnread={messagesUnread}
            notificationsUnread={notificationsUnread}
            notificationsConnectionDropped={notificationsConnectionDropped}
            formatCount={formatCount}
            me={me}
            meHeadline={meHeadline}
            menuOpen={menuOpen}
            onMenuOpenChange={setMenuOpen}
            onNavigate={onNavigate}
            onViewProfile={onViewProfile}
            onOpenSettings={onOpenSettings}
            onSignOut={onSignOut}
          />
        </div>
      </header>

      <div>{children}</div>
    </ShellFrame>
  );
}

function ShellFrame({ children }: { children: ReactNode }): JSX.Element {
  return <div className="bg-surface-muted min-h-screen">{children}</div>;
}

export type { AppShellRoute as _AppShellRouteCompatibility };
