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
//   • Renders via a portal-less fixed overlay; consumers should mount near the
//     root so it stacks above the AppShell.

import {
  useCallback,
  useEffect,
  useRef,
  type KeyboardEvent,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
} from "react";

import { Button } from "./Button";
import { Icon } from "./Icon";
import { cx } from "./cx";

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

  // Capture the opener so focus returns on close.
  useEffect(() => {
    if (open) {
      returnFocusRef.current = (document.activeElement as HTMLElement | null) ?? null;
      // Move focus into the dialog on open.
      const focusInitial = (): void => {
        const preferred = dialogRef.current?.querySelector<HTMLElement>("[data-autofocus]");
        const first = dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
        (preferred ?? first ?? dialogRef.current)?.focus();
      };
      focusInitial();
      const id = window.setTimeout(focusInitial, 0);
      return (): void => window.clearTimeout(id);
    }
    returnFocusRef.current?.focus?.();
    return undefined;
  }, [open]);

  // Lock body scroll while open. Cheap; no scroll-position rescue needed for MVP.
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return (): void => {
      document.body.style.overflow = prev;
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

  if (!open) return null;

  return (
    <div
      role="presentation"
      onClick={onBackdrop}
      className="z-modal fixed inset-0 flex items-center justify-center bg-[var(--scrim)] px-4 py-6"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        aria-describedby={describedBy}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className={cx(
          "bg-surface text-ink shadow-pop w-full max-w-md rounded-lg focus:outline-none focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]",
          className,
        )}
      >
        <div className="border-line-soft flex items-start justify-between gap-3 border-b px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-ink text-base font-semibold">{title}</h2>
            {description ? <p className="text-ink-muted mt-1 text-sm">{description}</p> : null}
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
}
