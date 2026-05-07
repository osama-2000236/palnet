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

import { Icon } from "./Icon";
import { cx } from "./cx";

export type ToastKind = "info" | "success" | "error";

export interface ToastProps {
  message: string;
  kind: ToastKind;
  onDismiss(): void;
  dismissLabel?: string;
}

export interface ShowToastInput {
  message: string;
  kind?: ToastKind;
  durationMs?: number;
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
}

const AUTO_DISMISS_MS = 3500;
const ToastContext = createContext<ToastContextValue | null>(null);
let nextToastId = 1;

export function Toast({
  message,
  kind,
  onDismiss,
  dismissLabel = "Dismiss notification",
}: ToastProps): JSX.Element {
  return (
    <div
      role={kind === "error" ? "alert" : "status"}
      className={cx(
        "shadow-pop pointer-events-auto flex min-h-11 w-full max-w-sm items-center gap-3 rounded-md px-4 py-3 text-sm font-semibold",
        kind === "success" && "bg-success text-ink-inverse",
        kind === "error" && "bg-danger text-ink-inverse",
        kind === "info" && "bg-info text-ink-inverse",
      )}
    >
      <span className="min-w-0 flex-1">{message}</span>
      <button
        type="button"
        aria-label={dismissLabel}
        onClick={onDismiss}
        className="focus-visible:ring-ink-inverse/80 inline-flex h-7 w-7 flex-none items-center justify-center rounded-md text-current opacity-80 hover:opacity-100 focus:outline-none focus-visible:ring-2"
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

  const dismiss = useCallback((id: number): void => {
    const timer = timers.current.get(id);
    if (timer) window.clearTimeout(timer);
    timers.current.delete(id);
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const showToast = useCallback(
    ({ message, kind = "info", durationMs = AUTO_DISMISS_MS }: ShowToastInput): void => {
      const id = nextToastId++;
      setItems((prev) => [...prev, { id, message, kind }]);
      if (durationMs > 0) {
        const timer = window.setTimeout(() => dismiss(id), durationMs);
        timers.current.set(id, timer);
      }
    },
    [dismiss],
  );

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
        className="pointer-events-none fixed bottom-6 z-[100] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2 [inset-inline-end:1.5rem]"
      >
        {items.map((item) => (
          <Toast
            key={item.id}
            message={item.message}
            kind={item.kind}
            dismissLabel={dismissLabel}
            onDismiss={() => dismiss(item.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const ToastHost = ToastProvider;

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
