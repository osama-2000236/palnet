"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import type { AppShellProps, AppShellRoute } from "./AppShell.types";
import { AppShellNav } from "./AppShellNav";
import { AppShellSearch } from "./AppShellSearch";
import { Icon } from "./Icon";

export type { AppShellLabels, AppShellProps, AppShellRoute } from "./AppShell.types";

const CONTENT_ID = "main-content";

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
      {/* AppShell puts 11 tab stops ahead of content on every page — logo,
          search, 8 nav items, profile menu. Screen readers can jump by
          landmark; sighted keyboard users had no way past them at all. */}
      {labels.skipToContent ? (
        <a
          href={`#${CONTENT_ID}`}
          // `min-h-target` even while `sr-only`: the link is reachable by Tab in
          // both states, so the targets sweep measures it in both. Meeting the
          // minimum is cheaper than arguing for an exemption.
          className="z-tooltip min-h-target min-w-target bg-surface text-ink shadow-pop sr-only items-center justify-center rounded-md px-4 py-2 text-sm font-semibold focus:not-sr-only focus:fixed focus:top-2 focus:inline-flex focus:[box-shadow:var(--focus-ring)] focus:[inset-inline-start:0.5rem]"
        >
          {labels.skipToContent}
        </a>
      ) : null}
      <header
        role="banner"
        className="z-nav border-line-soft bg-surface sticky top-0 h-14 border-b"
      >
        <div className="mx-auto flex h-full w-full min-w-0 max-w-[1128px] items-center gap-2 px-3 sm:gap-4 sm:px-5">
          <button
            type="button"
            onClick={() => onNavigate("feed")}
            aria-label={labels.logoAlt}
            className="target-area text-ink focus-visible:outline-hidden flex shrink-0 items-center gap-2 rounded-md py-1 hover:opacity-90 focus-visible:[box-shadow:var(--focus-ring)]"
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

      {/* A2.8: the target for the skip link. One id on the shell's content slot
          rather than on 49 route-level <main> elements. `tabIndex={-1}` so
          focus actually lands here — an anchor jump to a non-focusable element
          scrolls without moving focus in several browsers, which strands the
          keyboard user back at the top of the tab order. */}
      <div id={CONTENT_ID} tabIndex={-1} className="focus:outline-hidden">
        {children}
      </div>
    </ShellFrame>
  );
}

function ShellFrame({ children }: { children: ReactNode }): JSX.Element {
  return <div className="bg-surface-muted min-h-screen">{children}</div>;
}

export type { AppShellRoute as _AppShellRouteCompatibility };
