// packages/ui-web/src/index.ts — ADDITIONS for the new atoms.
//
// Append the following EXPORTS to the existing file. Order matches the
// alphabetic grouping already in place (Avatar → Button → Chip → Composer →
// ... → Input → ... → Alert is the odd one out and goes after the existing
// `safety` exports).

// ── At the top of the file, before `Button`: ────────────────────────────
export { Alert } from "./Alert";
export type { AlertProps, AlertKind } from "./Alert";

// ── After `Button`, before `Composer`: ──────────────────────────────────
export { Chip } from "./Chip";
export type { ChipProps, ChipSize } from "./Chip";

// ── After `Icon`, before `Illustration`: ────────────────────────────────
export { Input } from "./Input";
export type { InputProps, InputSize } from "./Input";
