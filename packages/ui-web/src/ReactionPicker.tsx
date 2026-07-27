// ReactionPicker — the like action plus the flyout that reaches the other five
// reaction types. See reactions.ts for why five sixths of this feature had no
// UI until now.
//
// Interaction contract, and why it is this shape:
//   • Click / Enter / Space toggles. Tapping "like" must stay one tap; making
//     the picker mandatory would tax the most common action to expose the rare
//     ones.
//   • The flyout opens on pointer dwell (140ms — long enough that scanning the
//     bar does not trip it), on long-press (400ms), and on **focus**. Focus is
//     what makes it keyboard-reachable at all: the category's usual answer is a
//     hover-only flyout that a keyboard user simply cannot open.
//   • Inside the flyout, Left/Right roves (mirrored under RTL, because the
//     visual order is mirrored too), Escape closes and returns focus to the
//     trigger.
//   • Reduced motion is handled by globals.css, which neutralises
//     `animate-enter-up` — nothing here animates conditionally.

"use client";

import { useEffect, useRef, useState } from "react";

import { cx } from "./cx";
import { ReactionGlyph } from "./ReactionGlyph";
import { REACTION_TINT, REACTION_TYPES, type ReactionKind } from "./reactions";

export interface ReactionPickerLabels {
  /** Per-kind name: { LIKE: "إعجاب", CELEBRATE: "تهنئة", … } */
  kind: Record<ReactionKind, string>;
  /** Accessible name of the flyout, e.g. "اختر تفاعلًا". */
  pick: string;
}

export interface ReactionPickerProps {
  /** The viewer's current reaction, or null. */
  reaction: ReactionKind | null;
  labels: ReactionPickerLabels;
  onSelect(next: ReactionKind | null): void;
  disabled?: boolean;
}

const DWELL_MS = 140;
const LONG_PRESS_MS = 400;

export function ReactionPicker({
  reaction,
  labels,
  onSelect,
  disabled = false,
}: ReactionPickerProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = (): void => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  const openAfter = (ms: number): void => {
    clearTimer();
    timer.current = setTimeout(() => setOpen(true), ms);
  };

  useEffect(() => clearTimer, []);

  useEffect(() => {
    if (!open) return;
    function onKey(event: globalThis.KeyboardEvent): void {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    }
    function onPointerDown(event: MouseEvent): void {
      if (rootRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onPointerDown);
    };
  }, [open]);

  const active = reaction !== null;
  const shown: ReactionKind = reaction ?? "LIKE";

  return (
    <div
      ref={rootRef}
      className="relative flex min-w-0 flex-1"
      onPointerEnter={(event) => {
        if (disabled || event.pointerType !== "mouse") return;
        openAfter(DWELL_MS);
      }}
      onPointerLeave={(event) => {
        if (event.pointerType !== "mouse") return;
        clearTimer();
        setOpen(false);
      }}
      onBlur={(event) => {
        if (rootRef.current?.contains(event.relatedTarget as Node)) return;
        setOpen(false);
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-pressed={active}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => {
          clearTimer();
          setOpen(false);
          onSelect(active ? null : "LIKE");
        }}
        onFocus={() => {
          if (!disabled) setOpen(true);
        }}
        onPointerDown={(event) => {
          if (disabled || event.pointerType === "mouse") return;
          openAfter(LONG_PRESS_MS);
        }}
        onPointerUp={clearTimer}
        className={cx(
          "target-area state-layer react-press inline-flex min-w-0 flex-1 items-center justify-center rounded-md py-2.5 text-sm font-medium transition-colors",
          // Measured at 390px in ar-PS: a 1fr cell is 83px and "إعادة نشر"
          // needs 87 with `gap-2 px-2`. Tightening to `gap-1.5 px-1` brings it
          // to 77 and buys 6px of headroom; the pressable box is unaffected
          // because `target-area` owns it, not the padding.
          "gap-1.5 px-1 sm:gap-2 sm:px-2",
          "focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]",
          "disabled:cursor-not-allowed disabled:opacity-60",
          active ? cx("font-semibold", REACTION_TINT[shown]) : "text-ink-muted hover:text-ink",
        )}
      >
        <span className="react-glyph inline-flex">
          <ReactionGlyph kind={shown} size={18} strokeWidth={active ? 2.2 : 1.8} />
        </span>
        <span className="truncate">{labels.kind[shown]}</span>
      </button>

      {open && !disabled ? (
        <div
          role="group"
          aria-label={labels.pick}
          onKeyDown={(event) => {
            if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
            const nodes = Array.from(
              event.currentTarget.querySelectorAll<HTMLButtonElement>("button"),
            );
            const index = nodes.indexOf(document.activeElement as HTMLButtonElement);
            event.preventDefault();
            // Visual order is mirrored under RTL, so ArrowRight must walk the
            // list backwards there or the caret appears to jump the wrong way.
            const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
            const forward = event.key === (rtl ? "ArrowLeft" : "ArrowRight");
            const step = forward ? 1 : -1;
            nodes[index === -1 ? 0 : (index + step + nodes.length) % nodes.length]?.focus();
          }}
          className={cx(
            "border-line-soft bg-surface shadow-pop z-dropdown absolute bottom-full start-0 mb-1 flex items-center gap-0.5 rounded-full border p-1",
            "duration-base ease-emphasized animate-enter-up",
          )}
        >
          {REACTION_TYPES.map((kind) => (
            <button
              key={kind}
              type="button"
              aria-label={labels.kind[kind]}
              aria-pressed={reaction === kind}
              title={labels.kind[kind]}
              onClick={() => {
                setOpen(false);
                onSelect(reaction === kind ? null : kind);
              }}
              className={cx(
                "state-layer inline-flex h-10 w-10 items-center justify-center rounded-full",
                "focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]",
                // Settle, don't pop: PR #96 established that Baydar's reaction
                // moment resolves rather than bursts, because the currency here
                // is Karama — a ledger — not a like count.
                "duration-base ease-standard transition-transform hover:-translate-y-0.5",
                reaction === kind ? "bg-surface-subtle" : null,
              )}
            >
              <ReactionGlyph kind={kind} size={22} tinted strokeWidth={2} />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
