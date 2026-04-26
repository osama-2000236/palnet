import type { InputHTMLAttributes } from "react";

import { cx } from "./cx";

export interface SwitchProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "checked" | "defaultChecked" | "defaultValue" | "onChange" | "value" | "size"
> {
  value?: boolean;
  defaultValue?: boolean;
  onValueChange?: (value: boolean) => void;
}

export function Switch({
  value,
  defaultValue,
  onValueChange,
  disabled,
  className,
  ...props
}: SwitchProps): JSX.Element {
  return (
    <label
      className={cx("inline-flex cursor-pointer items-center", disabled && "opacity-60", className)}
    >
      <input
        {...props}
        type="checkbox"
        role="switch"
        checked={value}
        defaultChecked={defaultValue}
        disabled={disabled}
        onChange={(event) => onValueChange?.(event.currentTarget.checked)}
        className="peer sr-only"
      />
      <span className="peer-focus-visible:ring-brand-600 peer-focus-visible:ring-offset-surface bg-line-hard peer-checked:bg-brand-400 flex h-6 w-11 items-center rounded-full p-0.5 transition-colors peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-offset-2">
        <span className="bg-surface shadow-card h-5 w-5 rounded-full transition-[margin] peer-checked:ms-5" />
      </span>
    </label>
  );
}
