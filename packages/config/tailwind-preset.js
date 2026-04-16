// Shared Tailwind preset for web (Next.js) and mobile (NativeWind).
// Keep tokens consistent across platforms — any new color/spacing/font goes here.

/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: {
        // Brand palette — Palestine-inspired but neutral-friendly for professional UX.
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
          // Olive/green nod — recognizable, professional.
          500: "#4d7c0f",
          600: "#3f6212",
        },
        surface: {
          DEFAULT: "#ffffff",
          muted: "#f8fafc",
          subtle: "#f1f5f9",
        },
        ink: {
          DEFAULT: "#0f172a",
          muted: "#475569",
          subtle: "#64748b",
        },
      },
      fontFamily: {
        // Arabic-first stack. "IBM Plex Sans Arabic" for headlines, "Noto Naskh Arabic" body.
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
        card: "0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.06)",
        pop: "0 8px 24px rgba(15, 23, 42, 0.10)",
      },
    },
  },
  plugins: [],
};
