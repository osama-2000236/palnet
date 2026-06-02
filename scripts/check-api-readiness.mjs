import http from "node:http";
import https from "node:https";

const targets = process.argv.slice(2);
const urls = targets.length > 0 ? targets : ["http://localhost:4000/api/v1/health"];

let failed = false;

for (const url of urls) {
  try {
    const res = await requestText(url);
    if (res.statusCode < 200 || res.statusCode >= 300) {
      failed = true;
      console.error(`[api:health] ${url} -> HTTP ${res.statusCode}: ${res.body.slice(0, 300)}`);
      continue;
    }
    console.log(`[api:health] ${url} -> OK`);
  } catch (error) {
    failed = true;
    console.error(`[api:health] ${url} -> ${error instanceof Error ? error.message : error}`);
  }
}

process.exit(failed ? 1 : 0);

function requestText(url) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const client = parsed.protocol === "https:" ? https : http;
    const req = client.request(
      parsed,
      { method: "GET", headers: { Accept: "application/json" }, timeout: 10_000 },
      (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => {
          resolve({ statusCode: res.statusCode ?? 0, body });
        });
      },
    );
    req.on("timeout", () => {
      req.destroy(new Error("request timed out"));
    });
    req.on("error", reject);
    req.end();
  });
}
