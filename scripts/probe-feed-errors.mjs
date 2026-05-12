import { chromium } from "playwright";
import { readFile } from "node:fs/promises";

const state = JSON.parse(await readFile("apps/web/tests/.auth/storageState.json", "utf8"));
const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  locale: "ar-PS",
});
await ctx.addCookies(state.cookies ?? []);
for (const o of state.origins ?? []) {
  await ctx.addInitScript((entries) => {
    for (const e of entries) localStorage.setItem(e.name, e.value);
  }, o.localStorage ?? []);
}
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push({ type: "pageerror", message: e.message, stack: e.stack }));
page.on("console", (msg) => {
  if (msg.type() === "error")
    errors.push({ type: "console.error", text: msg.text(), location: msg.location() });
});
page.on("requestfailed", (req) =>
  errors.push({ type: "requestfailed", url: req.url(), failure: req.failure()?.errorText }),
);
await page.goto("http://localhost:3000/ar-PS/feed", {
  waitUntil: "domcontentloaded",
  timeout: 30000,
});
await page.waitForTimeout(4000);
console.log(JSON.stringify(errors, null, 2));
console.log("---ERRORS COUNT:", errors.length);
await browser.close();
