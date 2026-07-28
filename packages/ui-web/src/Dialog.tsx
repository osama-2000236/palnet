"use client";

// Dialog — MVP modal primitive.
//
// API stable; visual spec owed by Claude Design (see HANDOFF-TO-DESIGN-2026-05-16
// §C.22). Internals can be re-skinned without touching consumers.
//
// Behaviour:
//   • Esc closes when not `blocking`.
//   • Backdrop click closes when not `blocking`.
//   • Returns focus to the previously-focused element on close.
//   • Uses logical layout (no left/right) — RTL-safe.
//   • Renders into a portal on <body>, so an ancestor with `transform` or
//     `overflow` cannot break its `position: fixed` (A2.15).

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import { Button } from "./Button";
import { cx } from "./cx";
import { Icon } from "./Icon";

export interface DialogProps {
  open: boolean;
  onClose(): void;
  title: string;
  description?: ReactNode;
  closeLabel?: string;
  showClose?: boolean;
  blocking?: boolean;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  contentClassName?: string;
  // aria-describedby target for body copy. Optional; consumers can pass an id
  // that points at their description element.
  describedBy?: string;
}

const FOCUSABLE_SELECTOR =
  "a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex='-1'])";

export function Dialog({
  open,
  onClose,
  title,
  description,
  closeLabel = "Close",
  showClose = true,
  blocking,
  children,
  footer,
  className,
  contentClassName,
  describedBy,
}: DialogProps): ReactElement | null {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();
  // Portals need a DOM target, which does not exist during SSR.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // A2.15: focus restore lives in the effect's *cleanup*, not in the next run's
  // else-branch. The old shape only restored when `open` flipped to false — a
  // consumer that unmounted the dialog while open dropped focus to <body>, and
  // the keyboard user started again from the top of the document.
  useEffect(() => {
    if (!open) return undefined;
    returnFocusRef.current = (document.activeElement as HTMLElement | null) ?? null;
    const focusInitial = (): void => {
      const preferred = dialogRef.current?.querySelector<HTMLElement>("[data-autofocus]");
      const first = dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      (preferred ?? first ?? dialogRef.current)?.focus();
    };
    focusInitial();
    const id = window.setTimeout(focusInitial, 0);
    return (): void => {
      window.clearTimeout(id);
      returnFocusRef.current?.focus?.();
    };
  }, [open]);

  // Lock body scroll while open, and put the scroll position back afterwards —
  // `overflow: hidden` alone drops the page to the top on close.
  useEffect(() => {
    if (!open) return undefined;
    const { scrollY } = window;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return (): void => {
      document.body.style.overflow = prev;
      window.scrollTo({ top: scrollY, behavior: "instant" as ScrollBehavior });
    };
  }, [open]);

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>): void => {
      if (event.key === "Escape" && !blocking) {
        event.stopPropagation();
        onClose();
        return;
      }

      if (event.key === "Tab") {
        const dialog = dialogRef.current;
        if (!dialog) return;
        const focusables = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
        if (focusables.length === 0) {
          event.preventDefault();
          dialog.focus();
          return;
        }
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement;
        if (active === dialog) {
          event.preventDefault();
          (event.shiftKey ? last : first)?.focus();
        } else if (event.shiftKey && active === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && active === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    },
    [blocking, onClose],
  );

  const onBackdrop = useCallback(
    (event: MouseEvent<HTMLDivElement>): void => {
      if (blocking) return;
      if (event.target === event.currentTarget) onClose();
    },
    [blocking, onClose],
  );

  if (!open || !mounted) return null;

  const overlay = (
    <div
      role="presentation"
      onClick={onBackdrop}
      className="dialog-scrim z-modal fixed inset-0 flex items-center justify-center bg-[var(--scrim)] px-4 py-6"
    >
      {/* A2.13: `aria-labelledby`, not `aria-label={title}` — the latter
          duplicates the visible <h2> and silently wins over it. */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={describedBy ?? (description ? descriptionId : undefined)}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className={cx(
          "dialog-panel bg-surface text-ink shadow-pop w-full max-w-md rounded-lg focus:outline-none focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]",
          className,
        )}
      >
        <div className="border-line-soft flex items-start justify-between gap-3 border-b px-5 py-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-ink text-base font-semibold">
              {title}
            </h2>
            {description ? (
              <p id={descriptionId} className="text-ink-muted mt-1 text-sm">
                {description}
              </p>
            ) : null}
          </div>
          {showClose && !blocking ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              aria-label={closeLabel}
              className="target-area h-8 w-8 px-0"
            >
              <Icon name="x" size={16} strokeWidth={2.2} />
            </Button>
          ) : null}
        </div>
        <div className={cx("px-5 py-4", contentClassName)}>{children}</div>
        {footer ? (
          <div className="border-line-soft bg-surface-muted flex justify-end gap-2 border-t px-5 py-3">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}
