"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

import { cx } from "./cx";

export type PopoverPlacement = "bottom-start" | "bottom-end" | "top-start" | "top-end";

export interface PopoverProps {
  trigger: ReactNode;
  children: ReactNode;
  label: string;
  placement?: PopoverPlacement;
  className?: string;
  panelClassName?: string;
}

const PANEL_PLACEMENT: Record<PopoverPlacement, string> = {
  "bottom-start": "top-full start-0 mt-2",
  "bottom-end": "top-full end-0 mt-2",
  "top-start": "bottom-full start-0 mb-2",
  "top-end": "bottom-full end-0 mb-2",
};

export function Popover({
  trigger,
  children,
  label,
  placement = "bottom-end",
  className,
  panelClassName,
}: PopoverProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (event: MouseEvent): void => {
      const target = event.target as Node | null;
      if (target && rootRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    return (): void => document.removeEventListener("mousedown", onPointer);
  }, [open]);

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>): void {
    if (event.key === "Escape") setOpen(false);
  }

  return (
    <div ref={rootRef} className={cx("relative inline-flex", className)}>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={onKeyDown}
        className="rounded-md focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]"
      >
        {trigger}
      </button>
      {open ? (
        <div
          role="dialog"
          className={cx(
            "border-line-soft bg-surface text-ink shadow-pop absolute z-50 min-w-52 rounded-md border p-2",
            PANEL_PLACEMENT[placement],
            panelClassName,
          )}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
