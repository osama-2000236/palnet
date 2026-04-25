import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const appJson = JSON.parse(await readFile(resolve(here, "..", "app.json"), "utf8"));
const projectId = appJson?.expo?.extra?.eas?.projectId;

if (!projectId || projectId === "REPLACE_WITH_EAS_PROJECT_ID") {
  throw new Error(
    "apps/mobile/app.json extra.eas.projectId must be set to the real Baydar EAS project ID.",
  );
}
