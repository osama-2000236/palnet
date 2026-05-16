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

export interface DialogProps {
  open: boolean;
  onClose(): void;
  title: string;
  blocking?: boolean;
  children: ReactNode;
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
  blocking,
  children,
  describedBy,
}: DialogProps): ReactElement | null {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  // Capture the opener so focus returns on close.
  useEffect(() => {
    if (open) {
      returnFocusRef.current = (document.activeElement as HTMLElement | null) ?? null;
      // Move focus into the dialog on open.
      const id = window.requestAnimationFrame(() => {
        const first = dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
        (first ?? dialogRef.current)?.focus();
      });
      return (): void => window.cancelAnimationFrame(id);
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
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-[var(--scrim)] px-4 py-6"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        aria-describedby={describedBy}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className="bg-surface text-ink shadow-pop w-full max-w-md rounded-lg focus:outline-none"
      >
        <div className="border-line-soft border-b px-5 py-4">
          <h2 className="text-ink text-base font-semibold">{title}</h2>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
