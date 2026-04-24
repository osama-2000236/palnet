"use client";

// MoreMenu — a single "⋯" button that opens a small popover of actions.
// Today the only actions are Report + Block, but the component keeps them
// pluggable so profile / comment / message surfaces can pass their own.
//
// Implemented as an uncontrolled button + onClick handler that opens a
// fixed-position menu anchored to the button. We purposely avoid pulling
// in a Radix popover — the menu is small and the positioning story is
// trivial (below-end). Escape + click-outside close.

import { Icon, cx } from "@palnet/ui-web";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

export interface MoreMenuItem {
  key: string;
  label: string;
  onClick(): void;
  danger?: boolean;
  icon?: ReactNode;
}

export function MoreMenu({
  label,
  items,
}: {
  label: string;
  items: MoreMenuItem[];
}): JSX.Element {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent): void {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent): void {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-muted hover:bg-surface-subtle hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
      >
        <Icon name="more" size={18} />
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          className={cx(
            "absolute z-20 mt-1 min-w-[200px] overflow-hidden rounded-md border border-line-soft bg-surface shadow-lg",
            // Anchor to the inline-end of the button — RTL-safe.
            "end-0 top-full",
          )}
        >
          {items.map((it) => (
            <button
              key={it.key}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                it.onClick();
              }}
              className={cx(
                "flex w-full items-center gap-2 px-3 py-2 text-start text-sm hover:bg-surface-subtle focus:outline-none focus-visible:bg-surface-subtle",
                it.danger ? "text-danger" : "text-ink",
              )}
            >
              {it.icon ? <span aria-hidden="true">{it.icon}</span> : null}
              <span className="flex-1">{it.label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
