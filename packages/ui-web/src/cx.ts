import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Compose Tailwind class strings with conflict resolution.
 *
 * Why both: `clsx` handles conditional arrays/objects; `twMerge` collapses
 * conflicting utilities so `cx("p-4", padding && "p-2")` resolves correctly
 * instead of emitting both classes and leaving the result to specificity.
 */
export function cx(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
