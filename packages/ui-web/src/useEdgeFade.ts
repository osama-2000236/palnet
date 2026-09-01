"use client";

import { useEffect, useState, type CSSProperties, type RefObject } from "react";

/**
 * Edge fade for a horizontal scroll strip — on the side that actually hides
 * content, and nowhere else.
 *
 * The strips used to carry a fixed `mask-image` that faded the first and last
 * 16px unconditionally. A mask paints on the scrollport, not on the content, so
 * whenever a strip was NOT scrolled (or could not scroll at all) the fade ate
 * the first 16px of the first item: measured on `/network`, where the tablist
 * reports `scrollWidth === clientWidth === 342` and the active tab sits flush
 * at `gapFromEdge: 0` — the opening letter of `علاقاتي` was erased on a strip
 * with nothing to scroll to.
 *
 * Measuring the children rather than `scrollLeft` keeps this direction-agnostic:
 * Chromium reports RTL scroll offsets as negative, Firefox and WebKit have each
 * used a different convention, and a rect comparison is true in all of them.
 */
const FADE_PX = 16;

export function useEdgeFade<T extends HTMLElement>(ref: RefObject<T | null>): CSSProperties {
  const [edges, setEdges] = useState({ left: false, right: false });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const measure = (): void => {
      const box = el.getBoundingClientRect();
      let left = false;
      let right = false;
      for (const child of Array.from(el.children)) {
        const rect = child.getBoundingClientRect();
        if (rect.left < box.left - 1) left = true;
        if (rect.right > box.right + 1) right = true;
      }
      setEdges((prev) => (prev.left === left && prev.right === right ? prev : { left, right }));
    };

    measure();
    el.addEventListener("scroll", measure, { passive: true });
    // Children as well as the strip: a late web font or a count arriving from
    // the API changes what overflows without resizing the strip itself.
    // Guarded because jsdom has no ResizeObserver — the one measure above is
    // still correct there, and a missing observer must not throw in a test.
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    if (observer) {
      observer.observe(el);
      for (const child of Array.from(el.children)) observer.observe(child);
    }
    return () => {
      el.removeEventListener("scroll", measure);
      observer?.disconnect();
    };
  }, [ref]);

  if (!edges.left && !edges.right) return {};

  const mask = `linear-gradient(to right, ${[
    edges.left ? `transparent 0, black ${FADE_PX}px` : "black 0",
    edges.right ? `black calc(100% - ${FADE_PX}px), transparent 100%` : "black 100%",
  ].join(", ")})`;

  return { maskImage: mask, WebkitMaskImage: mask };
}
