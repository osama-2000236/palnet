import type { Config } from "tailwindcss";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const preset = require("@baydar/config/tailwind-preset");

// In production we scan the compiled `dist/` output of @baydar/ui-web — that's
// exactly the shipped surface, no test files or fixtures, so the generated
// stylesheet shrinks. In dev we keep scanning `src/` so HMR picks up new
// class names instantly without waiting on a tsc rebuild.
const isProd = process.env.NODE_ENV === "production";
const uiWebGlobs = isProd
  ? ["../../packages/ui-web/dist/**/*.js"]
  : ["../../packages/ui-web/src/**/*.{ts,tsx}"];

const config: Config = {
  presets: [preset],
  content: ["./src/**/*.{ts,tsx}", "../../packages/ui-tokens/src/**/*.{ts,tsx}", ...uiWebGlobs],
  theme: { extend: {} },
  plugins: [],
};

export default config;
