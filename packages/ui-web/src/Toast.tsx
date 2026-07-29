"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { cx } from "./cx";
import { Icon } from "./Icon";

export type ToastKind = "info" | "success" | "error";

export interface ToastAction {
  label: string;
  onAction(): void;
}

export interface ToastProps {
  message: string;
  kind: ToastKind;
  onDismiss(): void;
  dismissLabel?: string;
  action?: ToastAction;
}

export interface ShowToastInput {
  message: string;
  kind?: ToastKind;
  durationMs?: number;
  /**
   * A toast carrying an action never auto-dismisses — WCAG 2.2.1 (Timing
   * Adjustable): you cannot offer a choice and then take it away on a timer.
   */
  action?: ToastAction;
}

export interface ToastContextValue {
  showToast(input: ShowToastInput): void;
}

export interface ToastProviderProps {
  children: ReactNode;
  dismissLabel?: string;
}

interface ToastItem {
  id: number;
  message: string;
  kind: ToastKind;
  action?: ToastAction;
  durationMs: number;
}

const AUTO_DISMISS_MS = 3500;
/**
 * Beyond three, the stack covers the content it is reporting on. The rest
 * queue and surface as room frees up rather than being dropped.
 */
const MAX_VISIBLE = 3;
const ToastContext = createContext<ToastContextValue | null>(null);
let nextToastId = 1;

export function Toast({
  message,
  kind,
  onDismiss,
  dismissLabel = "Dismiss notification",
  action,
}: ToastProps): JSX.Element {
  return (
    <div
      role={kind === "error" ? "alert" : "status"}
      className={cx(
        "toast-item shadow-pop pointer-events-auto flex min-h-11 w-full max-w-sm items-center gap-3 rounded-md px-4 py-3 text-sm font-semibold",
        kind === "success" && "bg-success text-ink-inverse",
        kind === "error" && "bg-danger text-ink-inverse",
        kind === "info" && "bg-info text-ink-inverse",
      )}
    >
      <span className="min-w-0 flex-1">{message}</span>
      {action ? (
        <button
          type="button"
          onClick={action.onAction}
          className="target-area focus-visible:outline-hidden shrink-0 rounded-md px-2 py-1 text-sm font-bold underline focus-visible:[box-shadow:var(--focus-ring)]"
        >
          {action.label}
        </button>
      ) : null}
      <button
        type="button"
        aria-label={dismissLabel}
        onClick={onDismiss}
        className="target-area focus-visible:outline-hidden inline-flex h-7 w-7 flex-none items-center justify-center rounded-md text-current opacity-80 hover:opacity-100 focus-visible:[box-shadow:var(--focus-ring)]"
      >
        <Icon name="x" size={16} strokeWidth={2.2} />
      </button>
    </div>
  );
}

export function ToastProvider({
  children,
  dismissLabel = "Dismiss notification",
}: ToastProviderProps): JSX.Element {
  const [items, setItems] = useState<ToastItem[]>([]);
  const timers = useRef(new Map<number, number>());
  const [paused, setPaused] = useState(false);

  const clearTimer = useCallback((id: number): void => {
    const timer = timers.current.get(id);
    if (timer) window.clearTimeout(timer);
    timers.current.delete(id);
  }, []);

  const dismiss = useCallback(
    (id: number): void => {
      clearTimer(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
    },
    [clearTimer],
  );

  const showToast = useCallback(
    ({ message, kind = "info", durationMs = AUTO_DISMISS_MS, action }: ShowToastInput): void => {
      const id = nextToastId++;
      // A toast with an action never auto-dismisses (WCAG 2.2.1).
      const effective = action ? 0 : durationMs;
      setItems((prev) => [...prev, { id, message, kind, action, durationMs: effective }]);
    },
    [],
  );

  // A2.11: timers live here rather than in `showToast` so hover and focus can
  // pause them. A fixed 3.5s is a poor fit for Arabic copy, which is longer to
  // read, and the previous version gave the reader no way to hold it.
  const visible = items.slice(0, MAX_VISIBLE);
  useEffect(() => {
    if (paused) {
      for (const id of Array.from(timers.current.keys())) clearTimer(id);
      return;
    }
    // Re-running is idempotent: timers are keyed by id and an existing one is
    // never replaced, so a toast that is already counting down keeps its
    // remaining time when the set changes around it.
    for (const item of items.slice(0, MAX_VISIBLE)) {
      if (item.durationMs <= 0 || timers.current.has(item.id)) continue;
      timers.current.set(
        item.id,
        window.setTimeout(() => dismiss(item.id), item.durationMs),
      );
    }
  }, [paused, items, clearTimer, dismiss]);

  useEffect(() => {
    const activeTimers = timers.current;
    return () => {
      for (const timer of activeTimers.values()) {
        window.clearTimeout(timer);
      }
      activeTimers.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        aria-live="polite"
        data-toast-paused={paused ? "true" : "false"}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={() => setPaused(false)}
        className="z-toast pointer-events-none fixed bottom-6 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2 [inset-inline-end:1.5rem]"
      >
        {visible.map((item) => (
          <Toast
            key={item.id}
            message={item.message}
            kind={item.kind}
            action={item.action}
            dismissLabel={dismissLabel}
            onDismiss={() => dismiss(item.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
