// Tailwind preset for mobile (NativeWind). Web uses @baydar/ui-tokens/tailwind-preset;
// this file stays standalone CJS because Metro loads tailwind config with plain
// Node (no build step). Values mirror packages/ui-tokens — `pnpm lint:tokens`
// fails on any hex here that no longer exists in the token source.
// Any new color/spacing/font lives in ui-tokens first, then lands here.

/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: {
        // Brand: deep olive. The Baydar (بيدر) mark color.
        brand: {
          50: "#f4f6ef",
          100: "#e6ebd6",
          200: "#ccd6a8",
          300: "#a9b878",
          400: "#879953",
          500: "#687a3a",
          600: "#526030", // primary
          700: "#3f4a26", // hover
          800: "#2e371d",
          900: "#1f2513",
        },
        // Accent: terracotta. One CTA per screen, unread badges, notification dots.
        accent: {
          50: "#fbf0ea",
          100: "#f4dbce",
          500: "#c65a3a",
          600: "#a8482c",
          700: "#8b3a22",
        },
        surface: {
          DEFAULT: "#ffffff",
          muted: "#faf9f5",
          subtle: "#f1efe7",
          sunken: "#ebe8dc",
        },
        ink: {
          DEFAULT: "#1a1a17",
          muted: "#5c5a52",
          subtle: "#8a8880",
          inverse: "#ffffff",
        },
        line: {
          soft: "rgba(26, 26, 23, 0.08)",
          hard: "rgba(26, 26, 23, 0.16)",
        },
        success: "#3b7a3b",
        warning: "#b07a1a",
        danger: "#a83232",
        info: "#2f6d8a",
      },
      fontFamily: {
        // Arabic-first stack.
        sans: [
          "IBM Plex Sans Arabic",
          "IBM Plex Sans",
          "system-ui",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        body: [
          "Noto Naskh Arabic",
          "IBM Plex Sans Arabic",
          "IBM Plex Sans",
          "system-ui",
          "sans-serif",
        ],
        mono: ["IBM Plex Mono", "ui-monospace", "monospace"],
      },
      borderRadius: {
        xs: "4px",
        sm: "6px",
        md: "10px",
        lg: "14px",
        xl: "20px",
      },
      spacing: {
        13: "3.25rem",
        15: "3.75rem",
        18: "4.5rem",
      },
      boxShadow: {
        card: "0 1px 2px rgba(26,26,23,0.04), 0 1px 3px rgba(26,26,23,0.05)",
        pop: "0 10px 28px rgba(26,26,23,0.12)",
      },
    },
  },
  plugins: [],
};
