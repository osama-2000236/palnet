import type { ChangeEvent } from "react";

import { cx } from "./cx";
import { Icon, type IconName } from "./Icon";

export function QuietChip({
  icon,
  label,
  onClick,
}: {
  icon: IconName;
  label: string;
  onClick(): void;
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "target-area text-ink-muted hover:bg-surface-subtle hover:text-ink focus-visible:outline-hidden inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium focus-visible:[box-shadow:var(--focus-ring)]",
      )}
    >
      <Icon name={icon} size={14} />
      {label}
    </button>
  );
}

export function FileChip({
  icon,
  label,
  accept,
  onChange,
  disabled,
}: {
  icon: IconName;
  label: string;
  accept: string;
  onChange(e: ChangeEvent<HTMLInputElement>): void;
  disabled: boolean;
}): JSX.Element {
  return (
    <label
      className={cx(
        "text-ink-muted hover:bg-surface-subtle hover:text-ink inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium focus-within:[box-shadow:var(--focus-ring)]",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <Icon name={icon} size={14} />
      {label}
      <input
        type="file"
        accept={accept}
        onChange={onChange}
        disabled={disabled}
        className="hidden"
      />
    </label>
  );
}
