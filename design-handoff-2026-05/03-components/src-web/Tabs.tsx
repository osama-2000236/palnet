"use client";

import { createContext, useContext, type ReactNode } from "react";
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
  return (
    <Ctx.Provider value={{ value, onChange }}>
      <div
        role="tablist"
        aria-label={label}
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
        "focus-visible:ring-brand-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
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
