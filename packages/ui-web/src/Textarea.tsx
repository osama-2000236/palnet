// Textarea — the multi-line twin of Input.
//
// `Input.tsx:10` has said "for multi-line, use <Textarea>" since it was written,
// and <Textarea> did not exist. Seven surfaces hand-rolled their own instead —
// the job description editor, ApplyDialog's cover letter, both profile editors,
// the message composer, Composer and ReportDialog — each with its own border,
// radius, focus treatment and (mostly missing) error wiring.
//
// Keeps Input's exact prop vocabulary: size / error / errorMessage / helper /
// fullWidth, same `:focus` ring rule (A2.7), same `role="alert"` on the error
// path (A2.6), same generated-id fix (A2.5).
//
// Adds two things a single-line field has no use for:
//   • `rows` — the resting height, in lines.
//   • `autoGrow` — grow with the content up to `maxRows`, then scroll. This is
//     what every composer in the category does, and it is why the message
//     composer had a hand-rolled one to begin with.

"use client";

import {
  forwardRef,
  useCallback,
  useId,
  useLayoutEffect,
  useRef,
  type ComponentPropsWithoutRef,
} from "react";

import { cx } from "./cx";

export type TextareaSize = "sm" | "md" | "lg";

export interface TextareaProps extends Omit<ComponentPropsWithoutRef<"textarea">, "size"> {
  size?: TextareaSize;
  error?: boolean;
  errorMessage?: string;
  helper?: string;
  fullWidth?: boolean;
  /** Resting height in lines. Default 3. */
  rows?: number;
  /** Grow with the content instead of scrolling at `rows`. */
  autoGrow?: boolean;
  /** Ceiling for `autoGrow`, in lines. Default 10. */
  maxRows?: number;
  className?: string;
}

const SIZE_CLASSES: Record<TextareaSize, string> = {
  sm: "text-small px-2.5 py-1.5",
  md: "text-sm px-3 py-2",
  lg: "text-body px-3.5 py-2.5",
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  {
    size = "md",
    error = false,
    errorMessage,
    helper,
    fullWidth = false,
    rows = 3,
    autoGrow = false,
    maxRows = 10,
    disabled,
    className,
    id,
    onInput,
    "aria-describedby": ariaDescribedBy,
    ...rest
  },
  ref,
): JSX.Element {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const helperId = errorMessage || helper ? `${fieldId}-helper` : undefined;
  const describedBy =
    helperId && ariaDescribedBy ? `${ariaDescribedBy} ${helperId}` : (helperId ?? ariaDescribedBy);

  const innerRef = useRef<HTMLTextAreaElement | null>(null);
  const setRefs = useCallback(
    (node: HTMLTextAreaElement | null) => {
      innerRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );

  const resize = useCallback(() => {
    const el = innerRef.current;
    if (!el || !autoGrow) return;
    // Collapse first or the box can only ever grow: scrollHeight of an already
    // tall element includes the height we gave it last time.
    el.style.height = "auto";
    const line = Number.parseFloat(getComputedStyle(el).lineHeight) || 20;
    const padding = el.offsetHeight - el.clientHeight;
    el.style.height = `${Math.min(el.scrollHeight, line * maxRows + padding)}px`;
  }, [autoGrow, maxRows]);

  // Layout effect, not effect: a paint at the wrong height is a visible jump on
  // any host that mounts with a draft already in the box.
  useLayoutEffect(resize, [resize, rest.value]);

  return (
    <span className={cx("inline-flex flex-col gap-1", fullWidth && "w-full")}>
      <textarea
        ref={setRefs}
        id={fieldId}
        rows={rows}
        disabled={disabled}
        aria-invalid={error || undefined}
        aria-describedby={describedBy}
        onInput={(event) => {
          resize();
          onInput?.(event);
        }}
        className={cx(
          "bg-surface text-ink w-full rounded-md border",
          "placeholder:text-ink-subtle",
          "duration-base ease-standard transition-colors",
          "focus:border-brand-600 focus:outline-none focus:[box-shadow:var(--focus-ring)]",
          "hover:border-line-hard",
          autoGrow ? "resize-none overflow-y-auto" : "resize-y",
          SIZE_CLASSES[size],
          error ? "border-danger focus:border-danger" : "border-line-hard",
          disabled && "bg-surface-subtle text-ink-subtle cursor-not-allowed",
          className,
        )}
        {...rest}
      />
      {errorMessage || helper ? (
        <span
          id={helperId}
          role={errorMessage ? "alert" : undefined}
          aria-live={errorMessage ? "polite" : undefined}
          className={cx("text-caption", errorMessage ? "text-danger" : "text-ink-muted")}
        >
          {errorMessage ?? helper}
        </span>
      ) : null}
    </span>
  );
});
