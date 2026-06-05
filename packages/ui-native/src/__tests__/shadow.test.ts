import { nativeTokens, shadowStyle, type ShadowKind } from "../index";

describe("shadowStyle", () => {
  it("returns token shadows for native platforms", () => {
    const kind: ShadowKind = "card";

    expect(shadowStyle(kind)).toEqual(nativeTokens.shadow.card);
  });
});
