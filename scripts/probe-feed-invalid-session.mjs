// Verifies feed redirects to /login when the stored session is invalid.
// Expected: zero pageerrors, final URL contains "/login".
import { chromium } from "playwright";

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  locale: "ar-PS",
});
await ctx.addInitScript(() => {
  // Garbage that satisfies the schema check but produces a junk access token.
  localStorage.setItem(
    "baydar.session.v1",
    JSON.stringify({
      user: { id: "00000000-0000-0000-0000-000000000000", email: "x@x.test" },
      tokens: { accessToken: "garbage.invalid.token", refreshToken: "garbage" },
    }),
  );
  localStorage.setItem("baydar.deviceId", "probe-invalid-session");
});
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push({ type: "pageerror", message: e.message }));
page.on("console", (msg) => {
  if (msg.type() === "error")
    errors.push({ type: "console.error", text: msg.text().slice(0, 200) });
});
await page.goto("http://localhost:3000/ar-PS/feed", {
  waitUntil: "domcontentloaded",
  timeout: 30000,
});
await page.waitForTimeout(3500);
const finalUrl = page.url();
console.log("final URL:", finalUrl);
console.log("pageerror count:", errors.filter((e) => e.type === "pageerror").length);
const consoleErrors = errors.filter((e) => e.type === "console.error");
console.log("console.error count:", consoleErrors.length);
if (consoleErrors.length > 0) {
  console.log("console.errors:", JSON.stringify(consoleErrors, null, 2));
}
await browser.close();
const ok = finalUrl.includes("/login") && errors.filter((e) => e.type === "pageerror").length === 0;
console.log(ok ? "PASS" : "FAIL");
process.exit(ok ? 0 : 1);
