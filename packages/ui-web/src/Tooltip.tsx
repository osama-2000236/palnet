"use client";

import { useId, type ReactNode } from "react";

import { cx } from "./cx";

export type TooltipPlacement = "top" | "bottom" | "start" | "end";

export interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  placement?: TooltipPlacement;
  disabled?: boolean;
  className?: string;
}

const PLACEMENT: Record<TooltipPlacement, string> = {
  top: "bottom-full start-1/2 mb-2 -translate-x-1/2 rtl:translate-x-1/2",
  bottom: "top-full start-1/2 mt-2 -translate-x-1/2 rtl:translate-x-1/2",
  start: "end-full top-1/2 me-2 -translate-y-1/2",
  end: "start-full top-1/2 ms-2 -translate-y-1/2",
};

export function Tooltip({
  content,
  children,
  placement = "top",
  disabled = false,
  className,
}: TooltipProps): JSX.Element {
  const id = useId();
  return (
    <span
      className={cx("group/tooltip relative inline-flex", className)}
      aria-describedby={disabled ? undefined : id}
    >
      {children}
      {!disabled ? (
        <span
          id={id}
          role="tooltip"
          className={cx(
            "border-line-soft bg-ink text-ink-inverse shadow-pop pointer-events-none absolute z-50 max-w-[18rem] whitespace-nowrap rounded-md border px-2 py-1 text-xs font-medium",
            "opacity-0 transition-opacity duration-150 group-focus-within/tooltip:opacity-100 group-hover/tooltip:opacity-100",
            PLACEMENT[placement],
          )}
        >
          {content}
        </span>
      ) : null}
    </span>
  );
}
