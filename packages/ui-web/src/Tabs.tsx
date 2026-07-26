"use client";

// Tabs — the APG tabs pattern, RTL-aware.
//
// The native counterpart is `SegmentedControl` in packages/ui-native, which is
// a different control with a different capability set (no counts). See
// docs/design/PARITY.md.

import { createContext, useCallback, useContext, useId, useRef, type ReactNode } from "react";

import { cx } from "./cx";

interface TabsCtx {
  value: string;
  onChange(next: string): void;
  baseId: string;
  formatCount(n: number): string;
  register(value: string, el: HTMLButtonElement | null): void;
  move(from: string, direction: "next" | "prev" | "first" | "last"): void;
}
const Ctx = createContext<TabsCtx | null>(null);

export interface TabsProps {
  value: string;
  onChange(next: string): void;
  children: ReactNode;
  className?: string;
  label?: string;
  /**
   * Locale-aware number formatter for tab counts. Injected rather than
   * imported: `packages/ui-web` may not depend on `@baydar/shared` (CLAUDE.md,
   * "shared UI is framework-neutral"), and without it counts render as Latin
   * digits inside an Arabic-Indic UI. Same contract as `AppShell`'s.
   */
  formatCount?: (n: number) => string;
}

export function Tabs({
  value,
  onChange,
  children,
  className,
  label,
  formatCount = String,
}: TabsProps): JSX.Element {
  const baseId = useId();
  const order = useRef<string[]>([]);
  const nodes = useRef(new Map<string, HTMLButtonElement>());

  const register = useCallback((tabValue: string, el: HTMLButtonElement | null): void => {
    if (el) {
      nodes.current.set(tabValue, el);
      if (!order.current.includes(tabValue)) order.current.push(tabValue);
    } else {
      nodes.current.delete(tabValue);
      order.current = order.current.filter((v) => v !== tabValue);
    }
  }, []);

  const move = useCallback(
    (from: string, direction: "next" | "prev" | "first" | "last"): void => {
      const list = order.current;
      if (list.length === 0) return;
      const current = list.indexOf(from);
      const index =
        direction === "first"
          ? 0
          : direction === "last"
            ? list.length - 1
            : direction === "next"
              ? (current + 1) % list.length
              : (current - 1 + list.length) % list.length;
      const next = list[index];
      if (next === undefined) return;
      // APG: the tabs pattern activates on focus, so selection follows the
      // arrow key rather than requiring a second Enter.
      onChange(next);
      nodes.current.get(next)?.focus();
    },
    [onChange],
  );

  return (
    <Ctx.Provider value={{ value, onChange, baseId, formatCount, register, move }}>
      <div
        role="tablist"
        aria-label={label}
        className={cx("border-line-soft flex flex-wrap items-end border-b", className)}
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
  /** Announced with the count, e.g. "12 unread". Falls back to the bare count. */
  countLabel?: (formatted: string) => string;
}

export function Tab({ value, children, count, countLabel }: TabProps): JSX.Element {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("<Tab> must be used inside <Tabs>");
  const active = ctx.value === value;
  const hasCount = typeof count === "number" && count > 0;
  const formatted = hasCount ? ctx.formatCount(count) : "";

  return (
    <button
      type="button"
      role="tab"
      id={`${ctx.baseId}-tab-${value}`}
      aria-controls={`${ctx.baseId}-panel-${value}`}
      aria-selected={active}
      tabIndex={active ? 0 : -1}
      ref={(el) => ctx.register(value, el)}
      onClick={() => ctx.onChange(value)}
      onKeyDown={(event) => {
        // Arrow keys follow reading order, so they invert under RTL. The
        // generic APG pattern does not say this, and getting it wrong makes
        // the keyboard walk the tabs backwards in Arabic.
        // Computed direction rather than `:dir(rtl)` — the pseudo-class is only
        // in recent Chrome/Safari and `matches()` throws on the rest.
        const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
        const forward = rtl ? "ArrowLeft" : "ArrowRight";
        const backward = rtl ? "ArrowRight" : "ArrowLeft";
        const map: Record<string, "next" | "prev" | "first" | "last"> = {
          [forward]: "next",
          [backward]: "prev",
          ArrowDown: "next",
          ArrowUp: "prev",
          Home: "first",
          End: "last",
        };
        const direction = map[event.key];
        if (!direction) return;
        event.preventDefault();
        ctx.move(value, direction);
      }}
      className={cx(
        // The active indicator is a full-width child drawn at the tab's own
        // bottom edge, not a `-mb-px border-b-2` on the button. The container is
        // `flex-wrap`, and `-mb-px` only reaches the container's border while
        // the tab happens to sit on the last row — Arabic labels wrap this strip
        // at 390px, which left the underline floating mid-component (F1).
        // min-h-11 == space[11] == 44px, the CLAUDE.md touch minimum (A3).
        "me-6 inline-flex min-h-11 flex-col justify-end px-0.5 font-sans text-sm font-medium",
        "focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]",
        active ? "text-ink" : "text-ink-muted hover:text-ink",
      )}
    >
      <span className="inline-flex items-center gap-2 py-3">
        <span>{children}</span>
        {hasCount ? (
          <span
            aria-hidden="true"
            className={cx(
              "rounded-full px-1.5 py-0.5 text-xs font-semibold leading-none",
              active ? "bg-brand-50 text-brand-700" : "bg-surface-subtle text-ink-muted",
            )}
          >
            {formatted}
          </span>
        ) : null}
        {/* The badge is decorative; the count belongs in the accessible name so
            a screen-reader user learns there are 12 message requests. */}
        {hasCount ? (
          <span className="sr-only">{countLabel ? countLabel(formatted) : formatted}</span>
        ) : null}
      </span>
      <span
        aria-hidden="true"
        className={cx(
          "duration-base ease-standard block h-0.5 w-full rounded-full transition-colors",
          active ? "bg-brand-600" : "bg-transparent",
        )}
      />
    </button>
  );
}

export interface TabPanelProps {
  value: string;
  children: ReactNode;
  className?: string;
}

export function TabPanel({ value, children, className }: TabPanelProps): JSX.Element | null {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("<TabPanel> must be used inside <Tabs>");
  if (ctx.value !== value) return null;
  return (
    <div
      role="tabpanel"
      id={`${ctx.baseId}-panel-${value}`}
      aria-labelledby={`${ctx.baseId}-tab-${value}`}
      tabIndex={0}
      className={cx(
        "focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]",
        className,
      )}
    >
      {children}
    </div>
  );
}
