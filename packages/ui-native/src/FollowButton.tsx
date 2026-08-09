// FollowButton - native twin of packages/ui-web/src/FollowButton.tsx.
//
// Same prop vocabulary: following / followsYou / labels / onToggle / size.
// Native has no `className` and takes `onPress` semantics through the same
// `onToggle`, because the toggle is the contract rather than the gesture.
//
// **متابعة** is follow, **تواصل** is connect. Never swapped, never on one
// button.

import { useState } from "react";

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
      variant={isFollowing ? "secondary" : "primary"}
      loading={busy}
      accessibilityLabel={isFollowing ? labels.unfollow : labels[state]}
      onPress={() => void toggle()}
    >
      {labels[state]}
    </Button>
  );
}
