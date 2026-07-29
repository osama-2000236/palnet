"use client";

import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";

import { cx } from "./cx";

export interface CheckboxProps extends Omit<
  ComponentPropsWithoutRef<"input">,
  "type" | "className" | "onChange"
> {
  label?: ReactNode;
  error?: boolean;
  errorMessage?: ReactNode;
  helper?: ReactNode;
  indeterminate?: boolean;
  className?: string;
  labelClassName?: string;
  inputClassName?: string;
  /**
   * Named to match `Switch`, the other boolean control, which already takes
   * `checked` + `onChange(value)` identically on both platforms. The DOM
   * `onChange` is omitted above, so this is the only `onChange` a caller sees.
   */
  onChange?(value: boolean): void;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  {
    label,
    error = false,
    errorMessage,
    helper,
    indeterminate = false,
    disabled,
    id,
    className,
    labelClassName,
    inputClassName,
    onChange,
    "aria-describedby": ariaDescribedBy,
    ...rest
  },
  ref,
): JSX.Element {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const messageId = `${inputId}-message`;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const message = errorMessage ?? helper;

  useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

  useEffect(() => {
    if (inputRef.current) inputRef.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <span className={cx("inline-flex flex-col gap-1", className)}>
      <label
        htmlFor={inputId}
        className={cx(
          // A3: the box is 16×16px. The `<label>` is the real pressable target
          // — clicking it toggles the input — so the expander goes here, not on
          // the input, which is a replaced element and renders no pseudo-element.
          // `min-h-target` covers the label-only case; `target-area` covers a
          // bare checkbox with no label text.
          "target-area min-h-target inline-flex items-center gap-2 text-sm",
          disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
          labelClassName,
        )}
      >
        <input
          {...rest}
          ref={inputRef}
          id={inputId}
          type="checkbox"
          disabled={disabled}
          aria-invalid={error || undefined}
          aria-describedby={
            message ? [ariaDescribedBy, messageId].filter(Boolean).join(" ") : ariaDescribedBy
          }
          onChange={(event) => {
            if (disabled) return;
            onChange?.(event.currentTarget.checked);
          }}
          className={cx(
            "rounded-xs border-line-hard text-brand-600 accent-brand-600 h-4 w-4 shrink-0",
            "focus-visible:outline-hidden focus-visible:[box-shadow:var(--focus-ring)]",
            error && "border-danger text-danger accent-danger",
            inputClassName,
          )}
        />
        {label ? <span className="text-ink leading-relaxed">{label}</span> : null}
      </label>
      {message ? (
        <span
          id={messageId}
          className={cx("text-xs", errorMessage ? "text-danger" : "text-ink-muted")}
        >
          {message}
        </span>
      ) : null}
    </span>
  );
});
