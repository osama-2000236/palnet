// Runtime-accessible tokens (in addition to the Tailwind preset).
// Use these when a style cannot be expressed as a Tailwind class (e.g. chart colors, native StyleSheet).

export const colors = {
  brand: {
    50: "#eff6ff",
    100: "#dbeafe",
    200: "#bfdbfe",
    300: "#93c5fd",
    400: "#60a5fa",
    500: "#3b82f6",
    600: "#2563eb",
    700: "#1d4ed8",
    800: "#1e40af",
    900: "#1e3a8a",
  },
  accent: {
    500: "#4d7c0f",
    600: "#3f6212",
  },
  surface: {
    base: "#ffffff",
    muted: "#f8fafc",
    subtle: "#f1f5f9",
  },
  ink: {
    base: "#0f172a",
    muted: "#475569",
    subtle: "#64748b",
  },
  semantic: {
    success: "#16a34a",
    warning: "#ca8a04",
    danger: "#dc2626",
    info: "#0284c7",
  },
} as const;

export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const;

export const radius = {
  xs: 4,
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 9999,
} as const;

export const typography = {
  sans: "IBM Plex Sans Arabic, IBM Plex Sans, system-ui, sans-serif",
  body: "Noto Naskh Arabic, IBM Plex Sans Arabic, system-ui, sans-serif",
} as const;

export const locale = {
  default: "ar-PS",
  fallback: "en",
  rtlDefault: true,
  supported: ["ar-PS", "en"] as const,
} as const;
