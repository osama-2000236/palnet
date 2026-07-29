"use client";

import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from "react";

import type { AppShellLabels } from "./AppShell.types";
import { Avatar, type AvatarUser } from "./Avatar";
import { cx } from "./cx";
import { Icon } from "./Icon";

interface AppShellProfileMenuProps {
  active: boolean;
  me: AvatarUser | null;
  meHeadline?: string | null;
  labels: AppShellLabels;
  open: boolean;
  onOpenChange(open: boolean): void;
  onViewProfile?(): void;
  onOpenSettings?(): void;
  onSignOut?(): void;
}

export function AppShellProfileMenu({
  active,
  me,
  meHeadline,
  labels,
  open,
  onOpenChange,
  onViewProfile,
  onOpenSettings,
  onSignOut,
}: AppShellProfileMenuProps): JSX.Element {
  const menuBtnRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent): void {
      const target = e.target as Node;
      if (menuRef.current?.contains(target) || menuBtnRef.current?.contains(target)) return;
      onOpenChange(false);
    }
    function onKey(e: globalThis.KeyboardEvent): void {
      if (e.key !== "Escape") return;
      onOpenChange(false);
      menuBtnRef.current?.focus();
    }
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [onOpenChange, open]);

  useEffect(() => {
    if (!open) return;
    const first = menuRef.current?.querySelector<HTMLButtonElement>("[role='menuitem']");
    first?.focus();
  }, [open]);

  function onMenuKeyDown(e: KeyboardEvent<HTMLDivElement>): void {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const menu = menuRef.current;
    if (!menu) return;
    const items = Array.from(menu.querySelectorAll<HTMLButtonElement>("[role='menuitem']"));
    const idx = items.indexOf(document.activeElement as HTMLButtonElement);
    e.preventDefault();
    const step = e.key === "ArrowDown" ? 1 : -1;
    const next = idx === -1 ? 0 : (idx + step + items.length) % items.length;
    items[next]?.focus();
  }

  return (
    <div className="relative flex items-stretch">
      <button
        ref={menuBtnRef}
        type="button"
        data-nav-profile
        onClick={() => onOpenChange(!open)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-current={active ? "page" : undefined}
        className={cx(
          "text-micro focus-visible:outline-hidden relative -mb-px inline-flex flex-col items-center gap-0.5 rounded-t-md border-b-2 px-3 py-1.5 font-medium transition-colors focus-visible:[box-shadow:var(--focus-ring)]",
          active
            ? "border-brand-600 text-ink"
            : "text-ink-muted hover:bg-surface-subtle hover:text-ink border-transparent",
        )}
      >
        {me ? (
          <Avatar user={me} size="sm" />
        ) : (
          <span className="bg-surface-sunken h-8 w-8 animate-pulse rounded-full" />
        )}
        <span className="inline-flex items-center gap-0.5">
          {labels.myProfile}
          <Icon name="chevron-down" size={12} />
        </span>
      </button>

      {open ? (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          onKeyDown={onMenuKeyDown}
          className="z-dropdown border-line-soft bg-surface shadow-card absolute end-0 top-full mt-1 min-w-[240px] rounded-md border py-1"
        >
          <ProfileHero
            me={me}
            meHeadline={meHeadline}
            labels={labels}
            onViewProfile={onViewProfile}
            onOpenChange={onOpenChange}
          />
          {onViewProfile && !me ? (
            <MenuItem onSelect={() => select(onOpenChange, onViewProfile)}>
              {labels.viewProfile}
            </MenuItem>
          ) : null}
          {onOpenSettings ? (
            <MenuItem onSelect={() => select(onOpenChange, onOpenSettings)}>
              {labels.settings}
            </MenuItem>
          ) : null}
          {onSignOut ? (
            <>
              <div role="separator" className="bg-line-soft my-1 h-px" />
              <MenuItem onSelect={() => select(onOpenChange, onSignOut)}>{labels.signOut}</MenuItem>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ProfileHero({
  me,
  meHeadline,
  labels,
  onViewProfile,
  onOpenChange,
}: Pick<
  AppShellProfileMenuProps,
  "me" | "meHeadline" | "labels" | "onViewProfile" | "onOpenChange"
>): JSX.Element | null {
  if (!me) return null;
  return (
    <div className="border-line-soft mb-1 flex gap-3 border-b px-3 py-3">
      <Avatar user={me} size="md" />
      <div className="min-w-0 flex-1">
        <p className="text-ink truncate text-sm font-semibold">
          {[me.firstName, me.lastName].filter(Boolean).join(" ") || me.handle || labels.myProfile}
        </p>
        {meHeadline ? <p className="text-ink-muted mt-0.5 truncate text-xs">{meHeadline}</p> : null}
        {onViewProfile ? (
          <button
            type="button"
            role="menuitem"
            onClick={() => select(onOpenChange, onViewProfile)}
            className="text-brand-700 hover:bg-brand-100 focus-visible:outline-hidden mt-2 rounded-md px-2 py-1 text-xs font-semibold focus-visible:[box-shadow:var(--focus-ring)]"
          >
            {labels.viewProfile}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function MenuItem({ children, onSelect }: { children: ReactNode; onSelect(): void }): JSX.Element {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onSelect}
      className="text-ink hover:bg-surface-subtle focus:bg-surface-subtle focus-visible:outline-hidden block w-full cursor-pointer px-3 py-2 text-start text-sm focus-visible:[box-shadow:var(--focus-ring)]"
    >
      {children}
    </button>
  );
}

function select(onOpenChange: (open: boolean) => void, action: () => void): void {
  onOpenChange(false);
  action();
}
