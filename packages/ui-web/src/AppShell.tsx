// AppShell — the sticky chrome wrapping every authenticated web route.
// Spec: docs/components/AppShell.md.
// Lifted from docs/_archive/prototype-2025/components/AppShell.jsx.
//
// Shape:
//   [Logo] [Search-pill] [flex] [nav items] [divider] [profile menu]
//
// Responsibilities of this component:
//   • Render the sticky header + dispatch to the `children` main.
//   • Show active highlight on the current nav item (prefix-matched).
//   • Expose a single `<input>` for global search; fire `onSearchChange` on
//     every keystroke so the host can `router.push('/search?q=...')`.
//   • Capture ⌘K / Ctrl+K and focus the search input.
//   • Render the profile menu (dropdown) with keyboard + outside-click close.
//
// What this component does NOT do:
//   • It never talks to the network. Unread counts, `me`, and sign-out are
//     injected via props — the (app) layout owns the data layer.
//   • It never picks a route. It only reports clicks/keys; the host routes.
//
// RTL: layout flows from start-to-end; nav items and divider live on the end
// side. All spacing uses logical properties (gap, inset-inline, etc.).

"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import { Avatar, type AvatarUser } from "./Avatar";
import { cx } from "./cx";
import { Icon, type IconName } from "./Icon";

export type AppShellRoute = "feed" | "network" | "jobs" | "messages" | "notifications" | "profile";

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
  moderation: string;
  signOut: string;
  /**
   * Screen-reader template for unread badges. `{count}` is replaced with the
   * formatted number (e.g. "3 رسائل غير مقروءة"). Keep it short.
   */
  unreadTemplate: Record<Exclude<AppShellRoute, "profile" | "feed" | "network" | "jobs">, string>;
}

export interface AppShellProps {
  /** Current pathname (already mapped to a route key by the host). */
  currentRoute: AppShellRoute | null;
  /** Signed-in user used for the profile avatar. Null during hydration. */
  me: AvatarUser | null;
  /** Optional profile headline rendered in the menu hero. */
  meHeadline?: string | null;
  /** i18n strings — required so AppShell never ships hardcoded Arabic/English. */
  labels: AppShellLabels;

  /** Unread counts. Undefined means "don't show a badge". */
  messagesUnread?: number;
  notificationsUnread?: number;

  /** Controlled search value. If omitted, input is uncontrolled. */
  searchValue?: string;
  onSearchChange?(next: string): void;
  /** Fired when the user presses Enter inside the search pill. */
  onSearchSubmit?(value: string): void;

  /** Fired when any nav item is activated (click, Enter, Space). */
  onNavigate(route: AppShellRoute): void;

  /** Profile menu actions. Each is optional — omitted items are hidden. */
  onViewProfile?(): void;
  onOpenSettings?(): void;
  onOpenModeration?(): void;
  onSignOut?(): void;

  /** Route group to highlight "my profile" when on /me or /in/{myHandle}. */
  children: ReactNode;
}

// Order matters: this is the visual order of the nav.
const NAV_ITEMS: ReadonlyArray<{
  key: Exclude<AppShellRoute, "profile">;
  icon: IconName;
}> = [
  { key: "feed", icon: "home" },
  { key: "network", icon: "users" },
  { key: "jobs", icon: "briefcase" },
  { key: "messages", icon: "message" },
  { key: "notifications", icon: "bell" },
];

/** 99+ cap so badges never break the compact badge target. */
function formatBadge(count: number): string {
  if (count <= 0) return "";
  if (count > 99) return "99+";
  return String(count);
}

export function AppShell({
  currentRoute,
  me,
  meHeadline,
  labels,
  messagesUnread,
  notificationsUnread,
  searchValue,
  onSearchChange,
  onSearchSubmit,
  onNavigate,
  onViewProfile,
  onOpenSettings,
  onOpenModeration,
  onSignOut,
  children,
}: AppShellProps): JSX.Element {
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const navRef = useRef<HTMLElement | null>(null);
  const menuBtnRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const menuId = useId();

  const [menuOpen, setMenuOpen] = useState(false);

  // ⌘K / Ctrl+K — focus search. Works from anywhere unless the user is typing
  // into another editable surface (avoid hijacking composer input).
  useEffect(() => {
    function onKey(e: globalThis.KeyboardEvent): void {
      if (!(e.key === "k" || e.key === "K")) return;
      if (!(e.metaKey || e.ctrlKey)) return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      const editing = tag === "INPUT" || tag === "TEXTAREA" || (target?.isContentEditable ?? false);
      // Allow ⌘K even while typing: it's a common "jump to search" gesture.
      // Only block when target is the search input itself (no-op).
      if (editing && target === searchInputRef.current) return;
      e.preventDefault();
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Close profile menu on outside click + Escape.
  useEffect(() => {
    if (!menuOpen) return;
    function onClick(e: MouseEvent): void {
      const t = e.target as Node;
      if (menuRef.current?.contains(t)) return;
      if (menuBtnRef.current?.contains(t)) return;
      setMenuOpen(false);
    }
    function onKey(e: globalThis.KeyboardEvent): void {
      if (e.key === "Escape") {
        setMenuOpen(false);
        menuBtnRef.current?.focus();
      }
    }
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  // Arrow-key roving between nav items (per AppShell.md accessibility rules).
  // Keys follow visual direction: ArrowRight always moves one step to the
  // physical right — which is "previous" in RTL and "next" in LTR. Home/End
  // jump to the first/last visible item.
  const onNavKeyDown = useCallback((e: KeyboardEvent<HTMLElement>) => {
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

    if (e.key === "Home") {
      focusables[0]?.focus();
      return;
    }
    if (e.key === "End") {
      focusables[focusables.length - 1]?.focus();
      return;
    }

    const isRtl =
      typeof document !== "undefined" && document.documentElement.getAttribute("dir") === "rtl";
    // Visual "next" = DOM next in LTR, DOM previous in RTL.
    const visualNext = isRtl ? e.key === "ArrowLeft" : e.key === "ArrowRight";
    const step = visualNext ? 1 : -1;
    const nextIdx = (idx + step + focusables.length) % focusables.length;
    focusables[nextIdx]?.focus();
  }, []);

  // When the profile menu opens, move focus to its first item. When it
  // closes (Esc, click-outside, selection), restore focus to the trigger.
  useEffect(() => {
    if (!menuOpen) return;
    const first = menuRef.current?.querySelector<HTMLButtonElement>("[role='menuitem']");
    first?.focus();
  }, [menuOpen]);

  const onMenuKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const menu = menuRef.current;
    if (!menu) return;
    const items = Array.from(menu.querySelectorAll<HTMLButtonElement>("[role='menuitem']"));
    const idx = items.indexOf(document.activeElement as HTMLButtonElement);
    e.preventDefault();
    const step = e.key === "ArrowDown" ? 1 : -1;
    const next = idx === -1 ? 0 : (idx + step + items.length) % items.length;
    items[next]?.focus();
  }, []);

  const onSearchKey = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        onSearchSubmit?.(e.currentTarget.value);
      }
    },
    [onSearchSubmit],
  );

  return (
    <div className="bg-surface-muted min-h-screen">
      <header role="banner" className="border-line-soft bg-surface sticky top-0 z-20 h-14 border-b">
        <div className="mx-auto flex h-full w-full max-w-chrome items-center gap-4 px-5">
          {/* Logo — routes home. */}
          <button
            type="button"
            onClick={() => onNavigate("feed")}
            aria-label={labels.logoAlt}
            className="text-ink focus-visible:ring-brand-600 focus-visible:ring-offset-surface flex shrink-0 items-center gap-2 rounded-md py-1 hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          >
            <Icon name="logo" size={32} />
            <span className="hidden text-lg font-semibold sm:inline">{labels.logoAlt}</span>
          </button>

          {/* Search pill. */}
          <div className="bg-surface-subtle focus-within:ring-brand-600 flex min-w-0 flex-1 items-center gap-2 rounded-full px-3.5 py-2 focus-within:ring-2 sm:max-w-search">
            <span className="text-ink-muted" aria-hidden="true">
              <Icon name="search" size={16} />
            </span>
            <input
              ref={searchInputRef}
              type="search"
              value={searchValue}
              onChange={(e) => onSearchChange?.(e.currentTarget.value)}
              onKeyDown={onSearchKey}
              placeholder={labels.searchPlaceholder}
              aria-label={labels.searchLabel}
              className="text-ink placeholder:text-ink-muted min-w-0 flex-1 bg-transparent text-sm focus:outline-none"
            />
          </div>

          {/* Right cluster: nav + divider + profile. */}
          <nav
            ref={navRef}
            onKeyDown={onNavKeyDown}
            aria-label={labels.mainNavLabel}
            className="flex items-stretch gap-1"
          >
            {NAV_ITEMS.map((item) => {
              const active = currentRoute === item.key;
              const count =
                item.key === "messages"
                  ? messagesUnread
                  : item.key === "notifications"
                    ? notificationsUnread
                    : undefined;
              const badgeText = typeof count === "number" ? formatBadge(count) : "";
              const srUnread =
                typeof count === "number" && count > 0
                  ? (labels.unreadTemplate as Record<string, string>)[item.key]?.replace(
                      "{count}",
                      String(count),
                    )
                  : undefined;

              return (
                <button
                  key={item.key}
                  type="button"
                  data-nav-item
                  onClick={() => onNavigate(item.key)}
                  aria-current={active ? "page" : undefined}
                  className={cx(
                    "focus-visible:ring-brand-600 focus-visible:ring-offset-surface relative -mb-px inline-flex min-w-navItem flex-col items-center gap-0.5 border-b-2 px-3 py-2 text-nav font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                    active
                      ? "border-brand-600 text-ink"
                      : "text-ink-muted hover:text-ink border-transparent",
                  )}
                >
                  <span className="relative">
                    <Icon name={item.icon} size={20} />
                    {badgeText ? (
                      <span
                        aria-hidden="true"
                        className="bg-accent-600 text-ink-inverse absolute -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-micro font-bold leading-none ltr:-end-1.5 rtl:-start-1.5"
                      >
                        {badgeText}
                      </span>
                    ) : null}
                    {srUnread ? <span className="sr-only">{srUnread}</span> : null}
                  </span>
                  <span>{labels.nav[item.key]}</span>
                </button>
              );
            })}

            {/* Vertical divider. */}
            <div aria-hidden="true" className="bg-line-soft mx-2 my-2 w-px" />

            {/* Profile menu. */}
            <div className="relative flex items-stretch">
              <button
                ref={menuBtnRef}
                type="button"
                data-nav-profile
                onClick={() => setMenuOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-controls={menuId}
                aria-current={currentRoute === "profile" ? "page" : undefined}
                className={cx(
                  "focus-visible:ring-brand-600 focus-visible:ring-offset-surface relative -mb-px inline-flex flex-col items-center gap-0.5 border-b-2 px-3 py-1.5 text-nav font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                  currentRoute === "profile"
                    ? "border-brand-600 text-ink"
                    : "text-ink-muted hover:text-ink border-transparent",
                )}
              >
                <Avatar user={me} size="sm" />
                <span className="inline-flex items-center gap-0.5">
                  {labels.myProfile}
                  <Icon name="chevron-down" size={12} />
                </span>
              </button>

              {menuOpen ? (
                <div
                  ref={menuRef}
                  id={menuId}
                  role="menu"
                  onKeyDown={onMenuKeyDown}
                  className="border-line-soft bg-surface shadow-card absolute end-0 top-full z-30 mt-1 min-w-menu rounded-md border py-1"
                >
                  {me ? (
                    <div className="border-line-soft mb-1 flex gap-3 border-b px-3 py-3">
                      <Avatar user={me} size="md" />
                      <div className="min-w-0 flex-1">
                        <p className="text-ink truncate text-sm font-semibold">
                          {[me.firstName, me.lastName].filter(Boolean).join(" ") ||
                            me.handle ||
                            labels.myProfile}
                        </p>
                        {meHeadline ? (
                          <p className="text-ink-muted mt-0.5 truncate text-xs">{meHeadline}</p>
                        ) : null}
                        {onViewProfile ? (
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setMenuOpen(false);
                              onViewProfile();
                            }}
                            className="text-brand-700 hover:bg-brand-100 focus-visible:ring-brand-600 mt-2 rounded-md px-2 py-1 text-xs font-semibold focus:outline-none focus-visible:ring-2"
                          >
                            {labels.viewProfile}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                  {onViewProfile && !me ? (
                    <MenuItem
                      onSelect={() => {
                        setMenuOpen(false);
                        onViewProfile();
                      }}
                    >
                      {labels.viewProfile}
                    </MenuItem>
                  ) : null}
                  {onOpenSettings ? (
                    <MenuItem
                      onSelect={() => {
                        setMenuOpen(false);
                        onOpenSettings();
                      }}
                    >
                      {labels.settings}
                    </MenuItem>
                  ) : null}
                  {onOpenModeration ? (
                    <MenuItem
                      onSelect={() => {
                        setMenuOpen(false);
                        onOpenModeration();
                      }}
                    >
                      {labels.moderation}
                    </MenuItem>
                  ) : null}
                  {onSignOut ? (
                    <>
                      <div role="separator" className="bg-line-soft my-1 h-px" />
                      <MenuItem
                        onSelect={() => {
                          setMenuOpen(false);
                          onSignOut();
                        }}
                      >
                        {labels.signOut}
                      </MenuItem>
                    </>
                  ) : null}
                </div>
              ) : null}
            </div>
          </nav>
        </div>
      </header>

      <div>{children}</div>
    </div>
  );
}

function MenuItem({ children, onSelect }: { children: ReactNode; onSelect(): void }): JSX.Element {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onSelect}
      className="text-ink hover:bg-surface-subtle focus:bg-surface-subtle block w-full cursor-pointer px-3 py-2 text-start text-sm focus:outline-none"
    >
      {children}
    </button>
  );
}
