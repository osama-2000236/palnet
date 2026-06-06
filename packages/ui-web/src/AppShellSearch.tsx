"use client";

import { type KeyboardEvent, type RefObject, useCallback } from "react";

import { Icon } from "./Icon";

interface AppShellSearchProps {
  inputRef: RefObject<HTMLInputElement | null>;
  value?: string;
  placeholder: string;
  label: string;
  onChange?(next: string): void;
  onSubmit?(value: string): void;
}

export function AppShellSearch({
  inputRef,
  value,
  placeholder,
  label,
  onChange,
  onSubmit,
}: AppShellSearchProps): JSX.Element {
  const onSearchKey = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      onSubmit?.(e.currentTarget.value);
    },
    [onSubmit],
  );

  return (
    <div className="bg-surface-subtle flex min-w-0 flex-1 items-center gap-2 rounded-full px-3.5 py-2 focus-within:[box-shadow:var(--focus-ring)] sm:max-w-[320px]">
      <span className="text-ink-muted" aria-hidden="true">
        <Icon name="search" size={16} />
      </span>
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => onChange?.(e.currentTarget.value)}
        onKeyDown={onSearchKey}
        placeholder={placeholder}
        aria-label={label}
        className="text-ink placeholder:text-ink-muted min-w-0 flex-1 rounded-sm bg-transparent text-sm focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]"
      />
    </div>
  );
}
