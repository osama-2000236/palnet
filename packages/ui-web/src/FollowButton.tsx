// FollowButton — متابعة, and never تواصل.
//
// The two words name different things and the register is not negotiable:
// **متابعة** is follow, **تواصل** is connect. They must never be swapped and
// must never appear on one button — a member who cannot tell them apart
// cannot tell an asymmetric edge from a mutual one.
//
// Optimistic, with a rollback. On 2G the round trip is most of a second and a
// button that does nothing for that long reads as broken; a button that lies
// about the outcome is worse, so a failure puts the old state back.

import { useState, type JSX } from "react";

import { Button } from "./Button";

export type FollowButtonState = "follow" | "following" | "followBack";

export interface FollowButtonLabels {
  follow: string;
  following: string;
  followBack: string;
  /** Announced after a successful toggle, for assistive technology. */
  unfollow: string;
}

export interface FollowButtonProps {
  following: boolean;
  /** They follow you and you do not follow them — the follow-back case. */
  followsYou?: boolean;
  labels: FollowButtonLabels;
  /** Resolve to the new state; reject to roll back. */
  onToggle: (next: boolean) => Promise<void>;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function variantFor(following: boolean, followsYou: boolean): FollowButtonState {
  if (following) return "following";
  return followsYou ? "followBack" : "follow";
}

export function FollowButton({
  following,
  followsYou = false,
  labels,
  onToggle,
  size = "sm",
  className,
}: FollowButtonProps): JSX.Element {
  // Local, because the optimistic value has to survive the parent's refetch
  // arriving late — which on this connection it will.
  const [optimistic, setOptimistic] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const isFollowing = optimistic ?? following;
  const state = variantFor(isFollowing, followsYou);

  async function toggle(): Promise<void> {
    const next = !isFollowing;
    setOptimistic(next);
    setBusy(true);
    try {
      await onToggle(next);
    } catch {
      setOptimistic(!next);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      size={size}
      className={className}
      variant={isFollowing ? "secondary" : "primary"}
      loading={busy}
      aria-label={isFollowing ? labels.unfollow : labels[state]}
      onClick={() => void toggle()}
    >
      {labels[state]}
    </Button>
  );
}
