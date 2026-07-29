// Menu — the popover action list. Native counterpart: ActionSheet (a menu that
// drops from a trigger is not a mobile pattern; a sheet from the bottom edge is,
// the same split already recorded for Dialog/Sheet in PARITY.md).
//
// Why it exists: the dismiss-on-outside-click, Escape-restores-focus and
// arrow-key roving logic was written once inside AppShellProfileMenu and needed
// a second copy the moment PostCard wanted a real overflow menu. PostCard's
// "…" button was worse than a duplicate — it was labelled `moreOptions` and
// wired straight to `onReport`, so the only thing the menu affordance could do
// was report the post. Same class of defect as the Sheet grabber that claimed
// "swipe to close" with no PanResponder behind it.
//
// APG menu-button pattern: trigger owns aria-haspopup/expanded/controls, the
// list is role="menu", items are role="menuitem", ArrowUp/Down roves, Escape
// closes and returns focus to the trigger.

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

import { cx } from "./cx";
import { Icon, type IconName } from "./Icon";

export interface MenuItemSpec {
  id: string;
  label: string;
  icon?: IconName;
  /** Second line under the label — the "why you're seeing this" affordance. */
  description?: string;
  /** Renders in the danger ramp. For report / block / delete. */
  destructive?: boolean;
  disabled?: boolean;
  onSelect(): void;
}

export interface MenuProps {
  /** Accessible name of the trigger. Required — this is an icon button by default. */
  label: string;
  items: MenuItemSpec[];
  /** Custom trigger content. Defaults to the `more` glyph. */
  trigger?: ReactNode;
  /** Extra class on the trigger button. */
  triggerClassName?: string;
  /** Which edge the panel aligns to. Logical, so it mirrors under RTL. */
  align?: "start" | "end";
  /** Node rendered above the items, inside the panel. */
  header?: ReactNode;
  /** Controlled open state. Omit for self-managed. */
  open?: boolean;
  onOpenChange?(open: boolean): void;
  className?: string;
}

export function Menu({
  label,
  items,
  trigger,
  triggerClassName,
  align = "end",
  header,
  open: controlledOpen,
  onOpenChange,
  className,
}: MenuProps): JSX.Element {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = useCallback(
    (next: boolean): void => {
      if (onOpenChange) onOpenChange(next);
      else setInternalOpen(next);
    },
    [onOpenChange],
  );

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent): void {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKey(event: globalThis.KeyboardEvent): void {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    }
    window.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, setOpen]);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.querySelector<HTMLButtonElement>("[role='menuitem']")?.focus();
  }, [open]);

  function onPanelKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    const panel = panelRef.current;
    if (!panel) return;
    const nodes = Array.from(panel.querySelectorAll<HTMLButtonElement>("[role='menuitem']"));
    const index = nodes.indexOf(document.activeElement as HTMLButtonElement);
    event.preventDefault();
    const step = event.key === "ArrowDown" ? 1 : -1;
    nodes[index === -1 ? 0 : (index + step + nodes.length) % nodes.length]?.focus();
  }

  return (
    <div className={cx("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={trigger ? undefined : label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen(!open)}
        className={cx(
          "target-area state-layer text-ink-muted hover:text-ink inline-flex items-center justify-center rounded-md",
          "focus-visible:outline-hidden focus-visible:[box-shadow:var(--focus-ring)]",
          trigger ? null : "h-8 w-8",
          triggerClassName,
        )}
      >
        {trigger ?? <Icon name="more" size={18} />}
      </button>

      {open ? (
        <div
          ref={panelRef}
          id={menuId}
          role="menu"
          aria-label={label}
          onKeyDown={onPanelKeyDown}
          className={cx(
            "z-dropdown border-line-soft bg-surface shadow-pop absolute top-full mt-1 min-w-[240px] rounded-md border py-1",
            "animate-enter-up duration-base ease-emphasized",
            align === "end" ? "end-0" : "start-0",
          )}
        >
          {header}
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
              className={cx(
                "state-layer flex w-full items-start gap-2.5 px-3 py-2 text-start",
                "focus-visible:outline-hidden focus-visible:[box-shadow:var(--focus-ring)]",
                item.destructive ? "text-danger" : "text-ink",
                item.disabled && "cursor-not-allowed opacity-55",
              )}
            >
              {item.icon ? (
                <span aria-hidden="true" className="mt-0.5 shrink-0">
                  <Icon name={item.icon} size={16} />
                </span>
              ) : null}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{item.label}</span>
                {item.description ? (
                  <span className="text-caption text-ink-muted mt-0.5 block">
                    {item.description}
                  </span>
                ) : null}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
