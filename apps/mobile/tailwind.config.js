const preset = require("@palnet/config/tailwind-preset");
const nativewindPreset = require("nativewind/preset");

/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [nativewindPreset, preset],
  content: [
    "./App.tsx",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "../../packages/ui-tokens/src/**/*.{ts,tsx}",
  ],
  darkMode: "class",
  theme: { extend: {} },
  plugins: [],
};
