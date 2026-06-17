import { buildCorsOrigin } from "./cors";

function allows(rawOrigins: string, origin: string | undefined): boolean {
  const matcher = buildCorsOrigin(rawOrigins);
  if (!matcher) return false;

  let allowed = false;
  matcher(origin, (_err, result) => {
    allowed = result === true;
  });
  return allowed;
}

describe("buildCorsOrigin", () => {
  it("allows exact origins", () => {
    expect(allows("https://baydar.ps", "https://baydar.ps")).toBe(true);
  });

  it("allows wildcard subdomain origins", () => {
    expect(allows("https://*.vercel.app", "https://web-preview.vercel.app")).toBe(true);
  });

  it("rejects the bare wildcard suffix origin", () => {
    expect(allows("https://*.vercel.app", "https://vercel.app")).toBe(false);
  });

  it("rejects unrelated origins", () => {
    expect(allows("https://*.vercel.app", "https://example.com")).toBe(false);
  });
});
