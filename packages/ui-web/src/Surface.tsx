import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";

import { cx } from "./cx";

/**
 * Five surface variants — the vocabulary for page hierarchy.
 * Lifted verbatim from docs/components/Surface.md.
 *
 * - flat:   list containers, sidebar cards, nested sections
 * - card:   feed posts, main content blocks (most common default)
 * - hero:   profile header, mini-profile, splash — top-of-page prominence
 * - tinted: inputs, own-message bubbles, quiet highlights
 * - row:    every item in a scrolling list
 *
 * Rule: don't nest `card` inside `card`. Use `flat` or `row` inside.
 */
export type SurfaceVariant = "flat" | "card" | "hero" | "tinted" | "row";

/** Token-scale padding keys. Numeric values correspond to the shared space scale. */
export type SurfacePadding = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "8" | "10" | "12";

const VARIANT_CLASSES: Record<SurfaceVariant, string> = {
  flat: "rounded-md border border-line-soft bg-surface",
  card: "rounded-lg border border-line-soft bg-surface shadow-card",
  hero: "overflow-hidden rounded-xl border border-line-soft bg-surface shadow-card",
  tinted: "rounded-md bg-surface-subtle",
  row: "border-b border-line-soft bg-transparent",
};

const PADDING_CLASSES: Record<SurfacePadding, string> = {
  "0": "",
  "1": "p-1",
  "2": "p-2",
  "3": "p-3",
  "4": "p-4",
  "5": "p-5",
  "6": "p-6",
  "8": "p-8",
  "10": "p-10",
  "12": "p-12",
};

export type SurfaceProps<E extends ElementType = "div"> = {
  variant?: SurfaceVariant;
  padding?: SurfacePadding;
  /** HTML element to render. Default `div`; use `section`, `article`, `aside` for semantics. */
  as?: E;
  className?: string;
  children?: ReactNode;
} & Omit<ComponentPropsWithoutRef<E>, "className" | "children" | "as">;

/**
 * Bounded content surface. Picks a visual treatment from a small, intentional
 * set of variants so we don't wrap every block in the same card + border + shadow.
 *
 * @example
 *   <Surface variant="card">Post body</Surface>
 *   <Surface variant="hero" as="header" padding="6">Profile top</Surface>
 *   <Surface variant="tinted" padding="3">Input background</Surface>
 */
export function Surface<E extends ElementType = "div">({
  variant = "card",
  padding = "4",
  as,
  className,
  children,
  ...rest
}: SurfaceProps<E>): JSX.Element {
  const Tag = (as ?? "div") as ElementType;
  return (
    <Tag className={cx(VARIANT_CLASSES[variant], PADDING_CLASSES[padding], className)} {...rest}>
      {children}
    </Tag>
  );
}
