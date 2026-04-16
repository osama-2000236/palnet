const preset = require("@palnet/config/tailwind-preset");

/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [preset],
  content: [
    "./App.tsx",
    "./src/**/*.{ts,tsx}",
    "../../packages/ui-tokens/src/**/*.{ts,tsx}",
  ],
  theme: { extend: {} },
  plugins: [],
};
