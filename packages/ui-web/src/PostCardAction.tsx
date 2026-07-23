"use client";

// One action in the PostCard action bar (like / comment / repost / save /
// send). Split out of PostCard.tsx to keep that file under the 300-LOC
// design gate; not exported from the package index.
import { cx } from "./cx";
import { Icon } from "./Icon";
import type { IconName } from "./Icon";

export function PostCardAction({
  icon,
  label,
  onClick,
  active,
  disabled,
}: {
  icon: IconName;
  label: string;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cx(
        "inline-flex min-w-0 flex-1 items-center justify-center gap-2 rounded-md px-2 py-2.5 text-sm font-medium transition-colors",
        "hover:bg-surface-subtle focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]",
        "disabled:cursor-not-allowed disabled:opacity-60",
        active ? "text-brand-700 font-semibold" : "text-ink-muted hover:text-ink",
      )}
    >
      <Icon name={icon} size={18} />
      {/* Five labelled actions overflow a 390px card: below `sm` the icon
          carries the action and the label stays for screen readers. */}
      <span className="sr-only sm:not-sr-only">{label}</span>
    </button>
  );
}
