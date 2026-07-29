// SwitchRow — a labelled setting row: title, optional description, Switch.
// Native twin: packages/ui-native/src/SwitchRow.tsx.
//
// `Switch` is a bare control taking `ariaLabel`, so every surface that needed a
// labelled setting wrote the same row by hand — `/settings/privacy`,
// `/settings/notifications` (twice, at two indent levels) and now the profile
// editor. They agreed on the shape and disagreed on the details: which of them
// drew the separator, whether the description was `text-xs` or `text-caption`,
// and whether the title was clickable (it never was — only the 40px switch
// itself was, on a row 500px wide).
//
// The whole row toggles here. That is the behaviour people expect from a
// settings list, and it turns a 40px target into a full-width one.

"use client";

import { useId, type ReactNode } from "react";

import { cx } from "./cx";
import { Switch } from "./Switch";

export interface SwitchRowProps {
  checked: boolean;
  onChange(value: boolean): void;
  label: string;
  description?: ReactNode;
  disabled?: boolean;
  className?: string;
}

export function SwitchRow({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  className,
}: SwitchRowProps): JSX.Element {
  const descriptionId = useId();
  return (
    <div
      // A row, not a <label>: the control is a <button role="switch">, and a
      // <label> wrapping a button does not forward the click the way it does
      // for a native input — it would look wired and do nothing.
      onClick={() => {
        if (!disabled) onChange(!checked);
      }}
      className={cx(
        "flex items-center justify-between gap-4 py-3",
        disabled ? "opacity-60" : "cursor-pointer",
        className,
      )}
    >
      <div className="min-w-0">
        <div className="text-ink text-sm font-medium">{label}</div>
        {description ? (
          <div id={descriptionId} className="text-caption text-ink-muted mt-0.5">
            {description}
          </div>
        ) : null}
      </div>
      {/* `stopPropagation` so the switch's own click is not counted twice by
          the row handler above — which would toggle and immediately untoggle. */}
      <div onClick={(event) => event.stopPropagation()} className="shrink-0">
        <Switch
          checked={checked}
          onChange={onChange}
          ariaLabel={label}
          disabled={disabled}
          aria-describedby={description ? descriptionId : undefined}
        />
      </div>
    </div>
  );
}
