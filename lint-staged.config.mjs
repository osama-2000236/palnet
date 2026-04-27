export default {
  "*.{ts,tsx,js,json,md}": () => ["pnpm lint:tokens", "pnpm --filter @baydar/mobile lint"],
};
