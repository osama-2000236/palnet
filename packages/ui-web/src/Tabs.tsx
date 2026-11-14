"use client";

import { createContext, useContext, type KeyboardEvent, type ReactNode } from "react";
import { cx } from "./cx";

interface TabsCtx {
  value: string;
  onChange(next: string): void;
}
const Ctx = createContext<TabsCtx | null>(null);

export interface TabsProps {
  value: string;
  onChange(next: string): void;
  children: ReactNode;
  className?: string;
  label?: string;
}

export function Tabs({ value, onChange, children, className, label }: TabsProps): JSX.Element {
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) return;
    const tabs = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]'),
    );
    const activeTab = (event.target as HTMLElement).closest('[role="tab"]');
    const activeIndex = tabs.findIndex((tab) => tab === activeTab);
    if (activeIndex < 0 || tabs.length === 0) return;

    event.preventDefault();
    const direction = getComputedStyle(event.currentTarget).direction === "rtl" ? -1 : 1;
    const nextIndex =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? tabs.length - 1
          : (activeIndex + (event.key === "ArrowRight" ? direction : -direction) + tabs.length) %
            tabs.length;
    tabs[nextIndex]?.focus();
    tabs[nextIndex]?.click();
  }

  return (
    <Ctx.Provider value={{ value, onChange }}>
      <div
        role="tablist"
        aria-label={label}
        onKeyDown={onKeyDown}
        className={cx("border-line-soft flex flex-wrap gap-0 border-b", className)}
      >
        {children}
      </div>
    </Ctx.Provider>
  );
}

export interface TabProps {
  value: string;
  children: ReactNode;
  count?: number;
}

export function Tab({ value, children, count }: TabProps): JSX.Element {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("<Tab> must be used inside <Tabs>");
  const active = ctx.value === value;
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      tabIndex={active ? 0 : -1}
      onClick={() => ctx.onChange(value)}
      className={cx(
        "-mb-px me-6 inline-flex items-center gap-2 border-b-2 px-0.5 py-3 font-sans text-sm font-medium transition-colors",
        "min-h-11 focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]",
        active ? "border-brand-600 text-ink" : "text-ink-muted hover:text-ink border-transparent",
      )}
    >
      <span>{children}</span>
      {typeof count === "number" && count > 0 ? (
        <span
          aria-hidden="true"
          className={cx(
            "rounded-full px-1.5 py-0.5 text-xs font-semibold leading-none",
            active ? "bg-brand-50 text-brand-700" : "bg-surface-subtle text-ink-muted",
          )}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}
