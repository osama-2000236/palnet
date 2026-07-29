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
        "target-area state-layer react-press inline-flex min-w-0 flex-1 items-center justify-center rounded-md py-2.5 text-sm font-medium transition-colors",
        // Measured at 390px in ar-PS: a 1fr cell is 83px and "إعادة نشر"
        // needs 87 with `gap-2 px-2`. Tightening to `gap-1.5 px-1` brings it
        // to 77 and buys 6px of headroom; the pressable box is unaffected
        // because `target-area` owns it, not the padding.
        "gap-1.5 px-1 sm:gap-2 sm:px-2",
        "focus-visible:outline-hidden focus-visible:[box-shadow:var(--focus-ring)]",
        "disabled:cursor-not-allowed disabled:opacity-60",
        active ? "text-brand-700 font-semibold" : "text-ink-muted hover:text-ink",
      )}
    >
      <span className="react-glyph inline-flex">
        <Icon name={icon} size={18} />
      </span>
      {/* PART 0 recorded that labelled actions overflowed a 390px card in
          Arabic — but that was measured with **five** actions, and share/send
          was deleted afterwards. Re-measured at 390px in ar-PS with the four
          that remain: the row wants 308px of 340px available, worst case
          ("محفوظ"), and nothing clips. So the labels come back: a bare icon row
          is a guessing game, and the label is what makes "إعادة نشر" different
          from "مساندة" at a glance. `truncate` + `min-w-0` keep a longer future
          label honest instead of overflowing. */}
      <span className="truncate">{label}</span>
    </button>
  );
}
