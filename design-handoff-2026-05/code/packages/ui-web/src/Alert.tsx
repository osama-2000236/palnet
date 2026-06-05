// Alert — persistent, in-flow message. Spec:
// design-handoff-2026-05/MISSING-ELEMENTS.md §12.
//
// Distinct from Toast (transient). Use Alert when the message must stay
// visible until the user resolves it: form-level errors, "verify your email"
// nags on the profile, "your feed couldn't load" with a retry.
//
// Today jobs/page.tsx shows fetch errors as plain copy inside a tinted
// Surface — no severity colour, no icon, no action. After this lands,
// replace that block with:
//
//   <Alert kind="danger" title={errorTitle}>
//     {errorMessage}
//     <Alert.Action onClick={retry}>{tCommon("retry")}</Alert.Action>
//   </Alert>
//
// Rules:
//   • Pick the right kind. `info` is the default; reserve `danger` for things
//     the user must address.
//   • Title is optional but encouraged — without one, the body should read
//     as a complete sentence.
//   • Pass `closable` only for dismissible nags. Errors that block a flow
//     should NOT be closable.

import type { JSX, ReactNode } from "react";

import { Icon } from "./Icon";
import { cx } from "./cx";

export type AlertKind = "info" | "success" | "warning" | "danger";

export interface AlertProps {
  kind?: AlertKind;
  title?: ReactNode;
  children: ReactNode;
  /** Primary action node — typically a <Button variant="ghost" size="sm">. */
  action?: ReactNode;
  /** Show a close button. Calls `onClose`. */
  closable?: boolean;
  onClose?: () => void;
  closeAriaLabel?: string;
  className?: string;
}

const KIND_CLASSES: Record<AlertKind, string> = {
  info: "bg-info/10    border-info/25    text-info",
  success: "bg-success/10 border-success/25 text-success",
  warning: "bg-warning/10 border-warning/25 text-warning",
  danger: "bg-danger/10  border-danger/25  text-danger",
};

const KIND_ICON: Record<AlertKind, JSX.Element> = {
  info: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8h.01M11 12h1v5h1" />
    </svg>
  ),
  success: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 3 3 5-6" />
    </svg>
  ),
  warning: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M12 3l10 17H2L12 3z" />
      <path d="M12 10v4M12 17h.01" />
    </svg>
  ),
  danger: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5M12 16h.01" />
    </svg>
  ),
};

export function Alert({
  kind = "info",
  title,
  children,
  action,
  closable = false,
  onClose,
  closeAriaLabel = "Dismiss",
  className,
}: AlertProps): JSX.Element {
  return (
    <div
      role={kind === "danger" || kind === "warning" ? "alert" : "status"}
      aria-live={kind === "danger" ? "assertive" : "polite"}
      className={cx(
        "flex items-start gap-3 rounded-md border px-3.5 py-3 text-sm",
        KIND_CLASSES[kind],
        className,
      )}
    >
      <span aria-hidden="true" className="mt-0.5 shrink-0">
        {KIND_ICON[kind]}
      </span>
      <div className="text-ink min-w-0 flex-1">
        {title ? (
          <div className="font-sans text-[14px] font-semibold leading-snug">{title}</div>
        ) : null}
        <div className={cx("text-ink-muted text-[13.5px] leading-relaxed", title && "mt-1")}>
          {children}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
      {closable ? (
        <button
          type="button"
          onClick={onClose}
          aria-label={closeAriaLabel}
          className="text-current/70 focus-visible:ring-current/30 ms-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md hover:text-current focus:outline-none focus-visible:ring-2"
        >
          <Icon name="x" size={14} strokeWidth={2.2} />
        </button>
      ) : null}
    </div>
  );
}
