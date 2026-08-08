import { ConnectionClass } from "./connection-class";
import {
  AVATAR_VARIANTS,
  IMAGE_VARIANTS,
  avatarUrlFor,
  avatarWidthFor,
  imageVariantUrl,
  imageWidthFor,
  postImageUrlFor,
} from "./image-variants";

const BASE = "https://images.baydar.ps/cdn-cgi/image";
const ORIGINAL = "https://cdn.baydar.ps/post_media/u_1/photo.jpg";

describe("which width a connection gets", () => {
  it("gives 2G the smallest of everything", () => {
    expect(imageWidthFor(ConnectionClass.SLOW)).toBe(320);
    expect(avatarWidthFor(ConnectionClass.SLOW)).toBe(32);
    expect(imageWidthFor(ConnectionClass.OFFLINE)).toBe(320);
  });

  it("scales up only as far as the connection earns", () => {
    expect(imageWidthFor(ConnectionClass.MODERATE)).toBe(640);
    expect(imageWidthFor(ConnectionClass.FAST)).toBe(1080);
    expect(avatarWidthFor(ConnectionClass.MODERATE)).toBe(96);
  });

  it("only ever names a width that is stored", () => {
    // Asking for a fourth width would 404, or worse, fall back to the original
    // upload — which on a phone camera is several megabytes.
    for (const connection of Object.values(ConnectionClass)) {
      expect(IMAGE_VARIANTS).toContain(imageWidthFor(connection));
      expect(AVATAR_VARIANTS).toContain(avatarWidthFor(connection));
    }
  });
});

describe("building the URL", () => {
  it("asks the transform for the width and lets it pick the format", () => {
    const url = imageVariantUrl(ORIGINAL, 640, BASE);
    expect(url).toContain("width=640");
    expect(url).toContain("format=auto");
    expect(url).toContain(encodeURIComponent(ORIGINAL));
  });

  it("returns the original when no transform is provisioned", () => {
    // The designed fallback: the product works and spends more bytes. Nothing
    // is hidden and nothing 404s while somebody sets up Cloudflare Images.
    expect(imageVariantUrl(ORIGINAL, 320, null)).toBe(ORIGINAL);
    expect(imageVariantUrl(ORIGINAL, 320, undefined)).toBe(ORIGINAL);
    expect(imageVariantUrl(ORIGINAL, 320, "")).toBe(ORIGINAL);
  });

  it("leaves a null image null", () => {
    expect(imageVariantUrl(null, 320, BASE)).toBeNull();
    expect(avatarUrlFor(undefined, ConnectionClass.FAST, BASE)).toBeNull();
  });

  it("does not rewrite something that is not an absolute URL", () => {
    // A relative path or a data URI has no origin to transform, and rewriting
    // one produces a path that does not exist.
    expect(imageVariantUrl("/local/avatar.png", 96, BASE)).toBe("/local/avatar.png");
    expect(imageVariantUrl("data:image/png;base64,AAA", 96, BASE)).toBe(
      "data:image/png;base64,AAA",
    );
  });

  it("tolerates a trailing slash on the base", () => {
    expect(imageVariantUrl(ORIGINAL, 320, `${BASE}/`)).toBe(imageVariantUrl(ORIGINAL, 320, BASE));
  });
});

describe("what the two callers send", () => {
  it("sends a 2G member a 32px avatar and a 320px image", () => {
    expect(avatarUrlFor(ORIGINAL, ConnectionClass.SLOW, BASE)).toContain("width=32");
    expect(postImageUrlFor(ORIGINAL, ConnectionClass.SLOW, BASE)).toContain("width=320");
  });

  it("sends a fast member a 96px avatar and a 1080px image", () => {
    expect(avatarUrlFor(ORIGINAL, ConnectionClass.FAST, BASE)).toContain("width=96");
    expect(postImageUrlFor(ORIGINAL, ConnectionClass.FAST, BASE)).toContain("width=1080");
  });
});
