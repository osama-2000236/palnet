import { HEADERS_METADATA } from "@nestjs/common/constants";

import { JobsController } from "./jobs/jobs.controller";
import { ProfilesController } from "./profiles/profiles.controller";

function cacheControlFor(method: (...args: never[]) => unknown): string | undefined {
  const headers = Reflect.getMetadata(HEADERS_METADATA, method) as
    | { name: string; value: string }[]
    | undefined;
  return headers?.find((header) => header.name.toLowerCase() === "cache-control")?.value;
}

describe("viewer-scoped cache headers", () => {
  it("does not publicly cache job detail responses with viewer state", () => {
    expect(cacheControlFor(JobsController.prototype.getOne)).toBe("private, no-store");
  });

  it("does not publicly cache profile responses with optional viewer state", () => {
    expect(cacheControlFor(ProfilesController.prototype.byHandle)).toBe("private, no-store");
  });
});
