import type { ReactNode } from "react";

import { cx } from "./cx";

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  scroll?: boolean;
  closeLabel?: string;
  className?: string;
}

export function Sheet({
  open,
  onClose,
  title,
  children,
  scroll = true,
  closeLabel = "إغلاق",
  className,
}: SheetProps): JSX.Element | null {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" role="presentation">
      <button
        type="button"
        aria-label={closeLabel}
        onClick={onClose}
        className="bg-ink/40 fixed inset-0 cursor-default"
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title ?? closeLabel}
        className={cx(
          "bg-surface shadow-pop border-line-soft fixed bottom-0 end-0 start-0 max-h-[85vh] rounded-t-xl border",
          className,
        )}
      >
        <div className="flex justify-center py-2">
          <span className="bg-line-hard h-1 w-9 rounded-full" />
        </div>
        {title ? (
          <header className="flex items-center justify-between gap-3 px-4 pb-2">
            <h2 className="text-ink min-w-0 truncate text-lg font-semibold">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label={closeLabel}
              className="focus-visible:ring-brand-600 hover:bg-surface-muted text-ink-muted inline-flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus-visible:ring-2"
            >
              <span aria-hidden="true">×</span>
            </button>
          </header>
        ) : null}
        <div className={cx("px-4 pb-6 pt-2", scroll && "overflow-y-auto")}>{children}</div>
      </section>
    </div>
  );
}
