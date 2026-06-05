"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

import { cx } from "./cx";

export type MenuPlacement = "bottom-start" | "bottom-end" | "top-start" | "top-end";

export type MenuEntry =
  | {
      type?: "item";
      id: string;
      label: ReactNode;
      onSelect(): void;
      leading?: ReactNode;
      shortcut?: string;
      danger?: boolean;
      disabled?: boolean;
    }
  | { type: "separator"; id: string }
  | { type: "label"; id: string; label: ReactNode };

export interface MenuProps {
  trigger: ReactNode;
  label: string;
  items: readonly MenuEntry[];
  placement?: MenuPlacement;
  className?: string;
}

const PLACEMENT: Record<MenuPlacement, string> = {
  "bottom-start": "top-full start-0 mt-2",
  "bottom-end": "top-full end-0 mt-2",
  "top-start": "bottom-full start-0 mb-2",
  "top-end": "bottom-full end-0 mb-2",
};

export function Menu({
  trigger,
  label,
  items,
  placement = "bottom-end",
  className,
}: MenuProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const selectable = items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item.type !== "separator" && item.type !== "label" && !item.disabled);

  useEffect(() => {
    if (!open) return undefined;
    const first = selectable[0]?.index ?? 0;
    setActiveIndex(first);
    window.requestAnimationFrame(() => itemRefs.current[first]?.focus());
    const onPointer = (event: MouseEvent): void => {
      const target = event.target as Node | null;
      if (target && rootRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    return (): void => document.removeEventListener("mousedown", onPointer);
  }, [open, selectable]);

  function move(delta: number): void {
    if (selectable.length === 0) return;
    const selectedIndex = Math.max(
      0,
      selectable.findIndex(({ index }) => index === activeIndex),
    );
    const next = selectable[(selectedIndex + delta + selectable.length) % selectable.length]?.index;
    if (next === undefined) return;
    setActiveIndex(next);
    itemRefs.current[next]?.focus();
  }

  function onListKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      move(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      move(-1);
    } else if (event.key === "Home") {
      event.preventDefault();
      const next = selectable[0]?.index;
      if (next !== undefined) {
        setActiveIndex(next);
        itemRefs.current[next]?.focus();
      }
    } else if (event.key === "End") {
      event.preventDefault();
      const next = selectable[selectable.length - 1]?.index;
      if (next !== undefined) {
        setActiveIndex(next);
        itemRefs.current[next]?.focus();
      }
    }
  }

  return (
    <div ref={rootRef} className={cx("relative inline-flex", className)}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((value) => !value)}
        className="rounded-md focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]"
      >
        {trigger}
      </button>
      {open ? (
        <div
          role="menu"
          aria-label={label}
          onKeyDown={onListKeyDown}
          className={cx(
            "border-line-soft bg-surface shadow-pop absolute z-50 flex min-w-52 flex-col gap-0.5 rounded-md border p-1 text-sm",
            PLACEMENT[placement],
          )}
        >
          {items.map((item, index) => {
            if (item.type === "separator") {
              return <div key={item.id} role="separator" className="bg-line-soft my-1 h-px" />;
            }
            if (item.type === "label") {
              return (
                <div
                  key={item.id}
                  className="text-ink-subtle px-2 py-1 text-[11px] font-semibold uppercase tracking-normal"
                >
                  {item.label}
                </div>
              );
            }
            return (
              <button
                key={item.id}
                ref={(node) => {
                  itemRefs.current[index] = node;
                }}
                type="button"
                role="menuitem"
                tabIndex={index === activeIndex ? 0 : -1}
                disabled={item.disabled}
                onFocus={() => setActiveIndex(index)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    item.onSelect();
                    setOpen(false);
                  }
                }}
                onClick={() => {
                  item.onSelect();
                  setOpen(false);
                }}
                className={cx(
                  "flex min-h-8 items-center gap-2 rounded-sm px-2 py-1.5 text-start transition-colors",
                  "focus:bg-surface-subtle hover:bg-surface-subtle focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]",
                  item.danger ? "text-danger" : "text-ink",
                  item.disabled && "cursor-not-allowed opacity-55",
                )}
              >
                {item.leading ? (
                  <span className="text-ink-muted inline-flex h-4 w-4 items-center justify-center">
                    {item.leading}
                  </span>
                ) : null}
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {item.shortcut ? (
                  <span className="text-ink-subtle ms-4 font-mono text-[11px]">
                    {item.shortcut}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
